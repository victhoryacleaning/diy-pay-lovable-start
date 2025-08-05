CREATE OR REPLACE FUNCTION set_new_default_cohort(p_space_id UUID, p_new_default_cohort_id UUID)
RETURNS void AS $$
BEGIN
  -- Primeiro, remove o status 'padrão' da turma antiga dentro do mesmo espaço.
  UPDATE cohorts
  SET is_default = false
  WHERE space_id = p_space_id AND is_default = true;

  -- Então, define a nova turma como 'padrão'.
  UPDATE cohorts
  SET is_default = true
  WHERE id = p_new_default_cohort_id;
END;
$$ LANGUAGE plpgsql;