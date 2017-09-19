# coding: utf-8

import config
import flask
import model
import auth

from main import app
from helpers import add_starred_to_posts
###############################################################################
# Welcome
###############################################################################



@app.route('/')
def welcome():
  post_dbs = add_starred_to_posts(
      model.Post.query().fetch()
  )

  return flask.render_template(
      'welcome.html',
      html_class='main-list',
      title='Welcome',
      post_dbs=post_dbs,
      next_url=''
  # util.generate_next_url(post_cursor),
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
