/*
  # Gift Cards System Setup

  1. New Tables
    - `gift_cards`
      - Core gift card information
      - Tracks status, amounts, and expiration
    - `gift_card_transactions`
      - Records all gift card usage
      - Links to orders and users

  2. Security
    - Enable RLS
    - Add policies for access control
    - Ensure data integrity
*/

-- Create gift cards table
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  recipient_email text NOT NULL,
  sender_id uuid REFERENCES auth.users(id),
  message text,
  is_used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  order_id uuid REFERENCES public.orders(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create gift card transactions table
CREATE TABLE IF NOT EXISTS public.gift_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id),
  amount_used numeric NOT NULL CHECK (amount_used > 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient ON public.gift_cards(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_sender ON public.gift_cards(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_expiry ON public.gift_cards(expires_at);
CREATE INDEX IF NOT EXISTS idx_gift_cards_used ON public.gift_cards(is_used);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_card ON public.gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_order ON public.gift_card_transactions(order_id);

-- Function to generate a unique gift card code
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_code text;
    done bool;
BEGIN
    done := false;
    WHILE NOT done LOOP
        -- Generate a random code in format GIFT-XXXX-XXXX
        new_code := 'GIFT-' || 
                    lpad(floor(random() * 9999)::text, 4, '0') || '-' ||
                    lpad(floor(random() * 9999)::text, 4, '0');
        
        -- Check if code exists
        done := NOT EXISTS (
            SELECT 1 FROM gift_cards WHERE code = new_code
        );
    END LOOP;
    
    RETURN new_code;
END;
$$;

-- Function to validate gift card
CREATE OR REPLACE FUNCTION validate_gift_card(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    card_data jsonb;
BEGIN
    SELECT jsonb_build_object(
        'valid', true,
        'id', id,
        'amount', amount,
        'is_used', is_used,
        'expires_at', expires_at
    )
    INTO card_data
    FROM gift_cards
    WHERE code = p_code
    AND NOT is_used
    AND expires_at > now();

    IF card_data IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message',
            CASE
                WHEN EXISTS (SELECT 1 FROM gift_cards WHERE code = p_code AND is_used)
                THEN 'Ce chèque cadeau a déjà été utilisé'
                WHEN EXISTS (SELECT 1 FROM gift_cards WHERE code = p_code AND expires_at <= now())
                THEN 'Ce chèque cadeau a expiré'
                ELSE 'Code invalide'
            END
        );
    END IF;

    RETURN card_data;
END;
$$;

-- Function to use gift card
CREATE OR REPLACE FUNCTION use_gift_card(
    p_code text,
    p_order_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_card_id uuid;
    v_card_amount numeric;
    v_validation jsonb;
BEGIN
    -- Validate the gift card first
    v_validation := validate_gift_card(p_code);
    
    IF NOT (v_validation->>'valid')::boolean THEN
        RETURN v_validation;
    END IF;

    v_card_id := (v_validation->>'id')::uuid;
    v_card_amount := (v_validation->>'amount')::numeric;

    -- Validate amount
    IF p_amount > v_card_amount THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', 'Montant demandé supérieur au solde du chèque cadeau'
        );
    END IF;

    -- Record the transaction
    INSERT INTO gift_card_transactions (
        gift_card_id,
        order_id,
        amount_used,
        created_by
    ) VALUES (
        v_card_id,
        p_order_id,
        p_amount,
        auth.uid()
    );

    -- Update gift card status
    UPDATE gift_cards
    SET 
        is_used = true,
        order_id = p_order_id,
        updated_at = now()
    WHERE id = v_card_id;

    RETURN jsonb_build_object(
        'valid', true,
        'message', 'Chèque cadeau utilisé avec succès',
        'amount_used', p_amount
    );
END;
$$;

-- Create RLS Policies

-- Gift Cards policies
CREATE POLICY "Users can view their own gift cards"
    ON public.gift_cards
    FOR SELECT
    TO authenticated
    USING (
        sender_id = auth.uid() OR
        recipient_email = (
            SELECT email FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create gift cards"
    ON public.gift_cards
    FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admins can manage all gift cards"
    ON public.gift_cards
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

-- Gift Card Transactions policies
CREATE POLICY "Users can view their own transactions"
    ON public.gift_card_transactions
    FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid() OR
        gift_card_id IN (
            SELECT id FROM gift_cards
            WHERE sender_id = auth.uid() OR
            recipient_email = (
                SELECT email FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create transactions"
    ON public.gift_card_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all transactions"
    ON public.gift_card_transactions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

-- Function to create a gift card
CREATE OR REPLACE FUNCTION create_gift_card(
    p_amount numeric,
    p_recipient_email text,
    p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_card_id uuid;
    v_code text;
    v_expires_at timestamptz;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Le montant doit être supérieur à 0';
    END IF;

    -- Generate unique code
    v_code := generate_gift_card_code();
    
    -- Set expiration date (1 year from now)
    v_expires_at := now() + interval '1 year';

    -- Create gift card
    INSERT INTO gift_cards (
        code,
        amount,
        recipient_email,
        sender_id,
        message,
        expires_at
    ) VALUES (
        v_code,
        p_amount,
        p_recipient_email,
        auth.uid(),
        p_message,
        v_expires_at
    )
    RETURNING id INTO v_card_id;

    RETURN jsonb_build_object(
        'success', true,
        'gift_card_id', v_card_id,
        'code', v_code,
        'amount', p_amount,
        'expires_at', v_expires_at
    );
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_card_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION create_gift_card TO authenticated;
GRANT EXECUTE ON FUNCTION validate_gift_card TO authenticated;
GRANT EXECUTE ON FUNCTION use_gift_card TO authenticated;