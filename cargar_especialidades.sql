CREATE TABLE IF NOT EXISTS bot_profesional_especialidad (
  nombre_normalizado TEXT PRIMARY KEY,
  nombre_display TEXT NOT NULL,
  especialidad_oficial TEXT NOT NULL,
  subespecialidad_formacion TEXT,
  grupo_clinico TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  es_sala_o_recurso BOOLEAN NOT NULL DEFAULT FALSE,
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prof_esp_grupo ON bot_profesional_especialidad(grupo_clinico);
CREATE INDEX IF NOT EXISTS idx_prof_esp_visible ON bot_profesional_especialidad(visible);

TRUNCATE TABLE bot_profesional_especialidad;

INSERT INTO bot_profesional_especialidad
  (nombre_normalizado, nombre_display, especialidad_oficial, subespecialidad_formacion, grupo_clinico, visible, es_sala_o_recurso) VALUES
  ('amahola paganelli',          'Amahola Paganelli',          'Medicina General', 'Salud Mental',         'salud_mental',       TRUE, FALSE),
  ('andrea j torres duran',      'Andrea J. Torres Duran',     'Medicina General', NULL,                   'medicina_general',   TRUE, FALSE),
  ('andrey ceballos',            'Andrey Ceballos',            'Medicina General', NULL,                   'medicina_general',   TRUE, FALSE),
  ('angela carolina rojas ruiz', 'Angela Carolina Rojas Ruiz', 'Medicina General', 'Otorrinolaringologia', 'otorrino',           TRUE, FALSE),
  ('argenis vasquez',            'Argenis Vasquez',            'Medicina General', 'Traumatologia',        'traumatologia',      TRUE, FALSE),
  ('arquimedes berty',           'Arquimedes Berty',           'Cirujano General', 'Endoscopia',           'cirugia_endoscopia', TRUE, FALSE),
  ('berta altamirano',           'Berta Altamirano',           'Medicina General', 'Neurologia',           'neurologia',         TRUE, FALSE),
  ('carlos albornoz',            'Carlos Albornoz',            'Medicina Familiar','Geriatria',            'geriatria',          TRUE, FALSE),
  ('carmen miranda',             'Carmen Miranda',             'Medicina General', 'Cardiologia',          'cardiologia',        TRUE, FALSE),
  ('constanza ramos avalos',     'Constanza Ramos Avalos',     'Psicologia',       NULL,                   'psicologia',         TRUE, FALSE),
  ('cristian arellano',          'Cristian Arellano',          'Pediatria',        NULL,                   'pediatria',          TRUE, FALSE),
  ('daniel cristian basaez diaz','Daniel Cristian Basaez Diaz','Psicologia',       NULL,                   'psicologia',         TRUE, FALSE),
  ('david arredondo',            'David Arredondo',            'Kinesiologia',     NULL,                   'kinesiologia',       TRUE, FALSE),
  ('francisca rojas',            'Francisca Rojas',            'Matrona',          NULL,                   'matrona',            TRUE, FALSE),
  ('gustavo ramon molina',       'Gustavo Ramon Molina',       'Medicina General', 'Psiquiatria',          'psiquiatria',        TRUE, FALSE),
  ('ingrid ojeda',               'Ingrid Ojeda',               'Medicina General', 'Gastroenterologia',    'gastroenterologia',  TRUE, FALSE),
  ('isabella verdessi',          'Isabella Verdessi',          'Nutricion',        NULL,                   'nutricion',          TRUE, FALSE),
  ('jesus pena',                 'Jesus Pena',                 'Medicina General', 'Broncopulmonar',       'broncopulmonar',     TRUE, FALSE),
  ('johan cardoza',              'Johan Cardoza',              'Medicina General', 'Gastroenterologia',    'gastroenterologia',  TRUE, FALSE),
  ('jorge lopez',                'Jorge Lopez',                'Traumatologia',    NULL,                   'traumatologia',      TRUE, FALSE),
  ('krasna ramos palta',         'Krasna Ramos Palta',         'Psicologia',       NULL,                   'psicologia',         TRUE, FALSE),
  ('leonel lodolo',              'Leonel Lodolo',              'Medicina General', 'Cardiologia',          'cardiologia',        TRUE, FALSE),
  ('leonor l morocho',           'Leonor L. Morocho',          'Medicina General', 'Ginecologia',          'ginecologia',        TRUE, FALSE),
  ('maria victoria martinez',    'Maria Victoria Martinez',    'Medicina General', 'Otorrinolaringologia', 'otorrino',           TRUE, FALSE),
  ('mariangela molina',          'Mariangela Molina',          'Medicina General', NULL,                   'medicina_general',   TRUE, FALSE),
  ('mariangela molina anciani',  'Mariangela Molina Anciani',  'Medicina General', 'Salud Mental',         'salud_mental',       TRUE, FALSE),
  ('myriam vicencio',            'Myriam Vicencio',            'Pediatria',        NULL,                   'pediatria',          TRUE, FALSE),
  ('natalie zuniga',             'Natalie Zuniga',             'Medicina General', 'Dermatologia',         'dermatologia',       TRUE, FALSE),
  ('nestor pulido',              'Nestor Pulido',              'Medicina General', NULL,                   'medicina_general',   TRUE, FALSE),
  ('omarelis valecillo',         'Omarelis Valecillo',         'Medicina General', 'Gastroenterologia',    'gastroenterologia',  TRUE, FALSE),
  ('victor narvaez',             'Victor Narvaez',             'Medicina General', NULL,                   'medicina_general',   TRUE, FALSE),
  ('yaikelin viera',             'Yaikelin Viera',             'Medicina General', 'Salud Mental',         'salud_mental',       TRUE, FALSE);

SELECT grupo_clinico, COUNT(*) AS cantidad
FROM bot_profesional_especialidad
WHERE visible = TRUE
GROUP BY grupo_clinico
ORDER BY cantidad DESC, grupo_clinico;
