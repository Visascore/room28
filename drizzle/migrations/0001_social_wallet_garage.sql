ALTER TABLE public.players ADD COLUMN IF NOT EXISTS display_name text, ADD COLUMN IF NOT EXISTS city_id text;

CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY,
  cash numeric NOT NULL DEFAULT 2000,
  savings numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  last_work_at timestamptz,
  last_interest_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet read" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  amount numeric NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.transactions(user_id, created_at DESC);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.car_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  class text NOT NULL,
  price numeric NOT NULL,
  prestige integer NOT NULL DEFAULT 1
);
GRANT SELECT ON public.car_models TO authenticated;
GRANT ALL ON public.car_models TO service_role;
ALTER TABLE public.car_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog readable" ON public.car_models FOR SELECT TO authenticated USING (true);

CREATE TABLE public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_id text NOT NULL REFERENCES public.car_models(id),
  bought_price numeric NOT NULL,
  upgrade_level integer NOT NULL DEFAULT 0,
  bought_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.cars(user_id);
GRANT SELECT ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "garages visible" ON public.cars FOR SELECT TO authenticated USING (true);

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid NOT NULL,
  addressee uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  bond integer NOT NULL DEFAULT 10,
  met_in text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester, addressee)
);
GRANT SELECT, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own friendships" ON public.friendships FOR SELECT TO authenticated USING (requester = auth.uid() OR addressee = auth.uid());
CREATE POLICY "remove own friendships" ON public.friendships FOR DELETE TO authenticated USING (requester = auth.uid() OR addressee = auth.uid());

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender uuid NOT NULL,
  recipient uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.messages(sender, recipient, created_at);
GRANT SELECT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own messages" ON public.messages FOR SELECT TO authenticated USING (sender = auth.uid() OR recipient = auth.uid());

-- helpers
CREATE OR REPLACE FUNCTION public.my_wallet() RETURNS public.wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets; uid uuid := auth.uid(); days numeric; gained numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  INSERT INTO wallets(user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO w FROM wallets WHERE user_id = uid FOR UPDATE;
  days := extract(epoch from (now() - w.last_interest_at)) / 86400.0;
  IF days > 0.01 AND w.savings > 0 THEN
    gained := round(w.savings * (power(1.015, days) - 1), 2); -- 1.5% per real day
    IF gained > 0 THEN
      UPDATE wallets SET savings = savings + gained, last_interest_at = now() WHERE user_id = uid RETURNING * INTO w;
      INSERT INTO transactions(user_id, kind, amount, note) VALUES (uid, 'interest', gained, 'Savings interest');
    END IF;
  ELSIF w.savings <= 0 THEN
    UPDATE wallets SET last_interest_at = now() WHERE user_id = uid RETURNING * INTO w;
  END IF;
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.work_shift(_job text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets; uid uuid := auth.uid(); pay numeric; cooldown int; tip text;
BEGIN
  w := public.my_wallet();
  cooldown := CASE _job WHEN 'gig' THEN 20 WHEN 'shift' THEN 60 WHEN 'contract' THEN 300 ELSE 60 END;
  IF w.last_work_at IS NOT NULL AND now() < w.last_work_at + make_interval(secs => cooldown) THEN
    RETURN jsonb_build_object('ok', false, 'wait', ceil(extract(epoch from (w.last_work_at + make_interval(secs => cooldown) - now()))));
  END IF;
  pay := CASE _job WHEN 'gig' THEN 40 + floor(random()*80) WHEN 'shift' THEN 150 + floor(random()*150) WHEN 'contract' THEN 600 + floor(random()*900) ELSE 100 END;
  tip := NULL;
  IF random() < 0.1 THEN pay := pay * 2; tip := 'Great work — double pay!'; END IF;
  UPDATE wallets SET cash = cash + pay, total_earned = total_earned + pay, last_work_at = now() WHERE user_id = uid;
  INSERT INTO transactions(user_id, kind, amount, note) VALUES (uid, 'earn', pay, initcap(_job));
  RETURN jsonb_build_object('ok', true, 'pay', pay, 'note', tip);
END $$;

CREATE OR REPLACE FUNCTION public.move_savings(_amount numeric, _to_savings boolean) RETURNS public.wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets; uid uuid := auth.uid();
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter an amount above zero'; END IF;
  w := public.my_wallet();
  IF _to_savings AND w.cash < _amount THEN RAISE EXCEPTION 'Not enough cash'; END IF;
  IF NOT _to_savings AND w.savings < _amount THEN RAISE EXCEPTION 'Not enough savings'; END IF;
  UPDATE wallets SET cash = cash + CASE WHEN _to_savings THEN -_amount ELSE _amount END,
    savings = savings + CASE WHEN _to_savings THEN _amount ELSE -_amount END WHERE user_id = uid RETURNING * INTO w;
  INSERT INTO transactions(user_id, kind, amount, note) VALUES (uid, CASE WHEN _to_savings THEN 'deposit' ELSE 'withdraw' END, _amount, CASE WHEN _to_savings THEN 'Moved to savings' ELSE 'Withdrew from savings' END);
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.car_value(_c public.cars) RETURNS numeric
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT round(greatest(_c.bought_price * 0.35, _c.bought_price * power(0.97, extract(epoch from (now() - _c.bought_at))/86400.0)) * (1 + 0.08 * _c.upgrade_level))
$$;

CREATE OR REPLACE FUNCTION public.buy_car(_model text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets; uid uuid := auth.uid(); m public.car_models; cid uuid;
BEGIN
  w := public.my_wallet();
  SELECT * INTO m FROM car_models WHERE id = _model;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown car'; END IF;
  IF w.cash < m.price THEN RAISE EXCEPTION 'Not enough cash for the %', m.name; END IF;
  UPDATE wallets SET cash = cash - m.price WHERE user_id = uid;
  INSERT INTO cars(user_id, model_id, bought_price) VALUES (uid, m.id, m.price) RETURNING id INTO cid;
  INSERT INTO transactions(user_id, kind, amount, note) VALUES (uid, 'car', -m.price, 'Bought ' || m.name);
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.sell_car(_car uuid) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c public.cars; v numeric; n text;
BEGIN
  PERFORM public.my_wallet();
  SELECT * INTO c FROM cars WHERE id = _car AND user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;
  v := public.car_value(c);
  SELECT name INTO n FROM car_models WHERE id = c.model_id;
  DELETE FROM cars WHERE id = c.id;
  UPDATE wallets SET cash = cash + v WHERE user_id = uid;
  INSERT INTO transactions(user_id, kind, amount, note) VALUES (uid, 'car', v, 'Sold ' || n);
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.upgrade_car(_car uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c public.cars; cost numeric; w public.wallets;
BEGIN
  w := public.my_wallet();
  SELECT * INTO c FROM cars WHERE id = _car AND user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Car not found'; END IF;
  IF c.upgrade_level >= 3 THEN RAISE EXCEPTION 'Already fully upgraded'; END IF;
  cost := round(c.bought_price * 0.12);
  IF w.cash < cost THEN RAISE EXCEPTION 'Upgrade costs %', cost; END IF;
  UPDATE wallets SET cash = cash - cost WHERE user_id = uid;
  UPDATE cars SET upgrade_level = upgrade_level + 1 WHERE id = c.id;
  INSERT INTO transactions(user_id, kind, amount, note) VALUES (uid, 'car', -cost, 'Car upgrade');
  RETURN c.upgrade_level + 1;
END $$;

CREATE OR REPLACE FUNCTION public.directory(_q text DEFAULT NULL, _city text DEFAULT NULL)
RETURNS TABLE(id uuid, display_name text, city_id text, last_seen timestamptz, cars bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, coalesce(p.display_name, split_part(p.email,'@',1)), p.city_id, p.last_seen,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.id)
  FROM players p
  WHERE p.id <> auth.uid() AND auth.uid() IS NOT NULL
    AND (_city IS NULL OR p.city_id = _city)
    AND (_q IS NULL OR coalesce(p.display_name, split_part(p.email,'@',1)) ILIKE '%' || _q || '%')
  ORDER BY p.last_seen DESC LIMIT 40
$$;

CREATE OR REPLACE FUNCTION public.befriend(_other uuid, _met_in text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); f public.friendships;
BEGIN
  IF uid IS NULL OR _other = uid THEN RAISE EXCEPTION 'Invalid'; END IF;
  SELECT * INTO f FROM friendships WHERE (requester = uid AND addressee = _other) OR (requester = _other AND addressee = uid);
  IF FOUND THEN
    IF f.status = 'pending' AND f.addressee = uid THEN
      UPDATE friendships SET status = 'accepted', bond = bond + 10 WHERE id = f.id; RETURN 'accepted';
    END IF;
    RETURN f.status;
  END IF;
  INSERT INTO friendships(requester, addressee, met_in) VALUES (uid, _other, _met_in);
  RETURN 'pending';
END $$;

CREATE OR REPLACE FUNCTION public.send_message(_to uuid, _body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF length(trim(coalesce(_body,''))) = 0 OR length(_body) > 1000 THEN RAISE EXCEPTION 'Message must be 1–1000 characters'; END IF;
  IF NOT EXISTS (SELECT 1 FROM friendships WHERE status='accepted' AND ((requester=uid AND addressee=_to) OR (requester=_to AND addressee=uid))) THEN
    RAISE EXCEPTION 'You can only message friends'; END IF;
  INSERT INTO messages(sender, recipient, body) VALUES (uid, _to, trim(_body));
  UPDATE friendships SET bond = least(100, bond + 1) WHERE status='accepted' AND ((requester=uid AND addressee=_to) OR (requester=_to AND addressee=uid));
END $$;

CREATE OR REPLACE FUNCTION public.hang_out(_friend uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); w public.wallets; b int;
BEGIN
  w := public.my_wallet();
  IF w.cash < 50 THEN RAISE EXCEPTION 'A night out costs 50'; END IF;
  UPDATE friendships SET bond = least(100, bond + 5) WHERE status='accepted' AND ((requester=uid AND addressee=_friend) OR (requester=_friend AND addressee=uid)) RETURNING bond INTO b;
  IF b IS NULL THEN RAISE EXCEPTION 'Not friends yet'; END IF;
  UPDATE wallets SET cash = cash - 50 WHERE user_id = uid;
  INSERT INTO transactions(user_id, kind, amount, note) VALUES (uid, 'social', -50, 'Night out with a friend');
  RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.friend_list() RETURNS TABLE(friendship_id uuid, other uuid, display_name text, city_id text, status text, incoming boolean, bond integer, met_in text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, o.id, coalesce(o.display_name, split_part(o.email,'@',1)), o.city_id, f.status, f.addressee = auth.uid(), f.bond, f.met_in
  FROM friendships f JOIN players o ON o.id = CASE WHEN f.requester = auth.uid() THEN f.addressee ELSE f.requester END
  WHERE f.requester = auth.uid() OR f.addressee = auth.uid()
  ORDER BY f.bond DESC
$$;

REVOKE EXECUTE ON FUNCTION public.my_wallet(), public.work_shift(text), public.move_savings(numeric, boolean), public.buy_car(text), public.sell_car(uuid), public.upgrade_car(uuid), public.directory(text, text), public.befriend(uuid, text), public.send_message(uuid, text), public.hang_out(uuid), public.friend_list() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_wallet(), public.work_shift(text), public.move_savings(numeric, boolean), public.buy_car(text), public.sell_car(uuid), public.upgrade_car(uuid), public.directory(text, text), public.befriend(uuid, text), public.send_message(uuid, text), public.hang_out(uuid), public.friend_list(), public.car_value(public.cars) TO authenticated;