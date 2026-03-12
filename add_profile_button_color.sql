-- Cor do botão separada da cor da marca no perfil de email
alter table email_profiles
  add column if not exists button_color text not null default '#db4035';
