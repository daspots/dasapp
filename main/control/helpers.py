# coding: utf-8

import config
import flask
import model
import auth
from main import app

def add_starred_to_posts(post_dbs):
    if auth.current_user_key():
        user_db = auth.current_user_key().get()

        for post_db in post_dbs:
            stars = model.Star.query(model.Star.post_key == post_db.key, model.Star.user_key == user_db.key).fetch()
            if len(stars) > 0:
                post_db.starred = True

    return post_dbs


