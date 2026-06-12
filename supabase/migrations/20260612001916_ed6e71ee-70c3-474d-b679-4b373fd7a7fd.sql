
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.build_referral_code_from_name(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, public;
