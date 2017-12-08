# coding: utf-8

import config
import flask
import model
import auth
import util

from main import app
from helpers import add_starred_to_posts
###############################################################################
# Welcome
###############################################################################
@app.route('/')
def landing_page():
    # For now we redirect to eat new york, will be changed in the future
    # depending on location
    return flask.redirect(flask.url_for('welcome'), code=302)


@app.route('/eat-new-york')
def welcome():
  post_dbs, post_cursor = model.Post.get_dbs(
      query=model.Post.query().order(-model.Post.created),
      limit=30,
  )
  post_dbs = add_starred_to_posts(
      post_dbs
  )
  return flask.render_template(
      'welcome.html',
      html_class='main-list',
      title='Welcome',
      post_dbs=post_dbs,
      next_url=util.generate_next_url(post_cursor),
      search_query='*',
      # prev_url=util.generate_prev_url(post_cursor),
    )


###############################################################################
# Sitemap stuff
###############################################################################
@app.route('/sitemap.xml')
def sitemap():
  response = flask.make_response(flask.render_template(
    'sitemap.xml',
    lastmod=config.CURRENT_VERSION_DATE.strftime('%Y-%m-%d'),
  ))
  response.headers['Content-Type'] = 'application/xml'
  return response


###############################################################################
# Warmup request
###############################################################################
@app.route('/_ah/warmup')
def warmup():
  # TODO: put your warmup code here
  return 'success'
