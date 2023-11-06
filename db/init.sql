CREATE TABLE bots (
    id serial PRIMARY KEY,
    token varchar NOT NULL UNIQUE,
    link varchar NOT NULL UNIQUE
);


CREATE TABLE users (
    id serial PRIMARY KEY,
    chat_id serial NOT NULL UNIQUE,
    student_id serial NOT NULL,
    user_id serial NOT NULL,
    class_id serial NOT NULL,
    token_id serial REFERENCES bots (id) ON DELETE CASCADE
);