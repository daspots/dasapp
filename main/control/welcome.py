# coding: utf-8

import flask
import auth
import model
import config
import util

from main import app


###############################################################################
# Welcome
###############################################################################
# @app.route('/')
# def welcome():
#   return flask.render_template('welcome.html', html_class='welcome')

@app.route('/')
def welcome():
  post_dbs, post_cursor = model.Post.get_dbs(
      user_key=auth.current_user_key(),
    )
  return flask.render_template(
      'welcome.html',
      html_class='main-list',
      title='Post List',
      post_dbs=post_dbs,
      next_url=util.generate_next_url(post_cursor),
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
