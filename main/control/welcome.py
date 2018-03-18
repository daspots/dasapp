# coding: utf-8

import config
import flask
import model
import auth
import util

from main import app
from helpers import add_starred_to_posts
from google.appengine.api import search
from google.appengine.ext import ndb


###############################################################################
# Welcome
###############################################################################
@app.route('/')
def landing_page():
    # For now we redirect to eat new york, will be changed in the future
    # depending on location
    return flask.redirect(flask.url_for('welcome', city_url='eat-new-york'), code=302)


@app.route('/<city_url>')
def welcome(city_url):

  if city_url == 'eat-london':
      city = 'london'
  else:
      city = 'new york'

  post_dbs, query = get_q_and_postdbs(city)

  return flask.render_template(
      'welcome.html',
      html_class='main-list',
      title='Welcome',
      post_dbs=post_dbs,
      # next_url=flask.url_for('welcome', city_url='eat-new-york'),
      search_query=query,
      city=city
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


def get_q_and_postdbs(query):
    query = query.replace('+', ' ').replace(',', '')
    index = search.Index('spots')
    search_results = index.search(query)
    all_docs = [ndb.Key('Post', int(doc.doc_id)) for doc in search_results]
    post_dbs = [post for post in ndb.get_multi(all_docs) if post is not None]
    post_dbs = add_starred_to_posts(post_dbs)
    return post_dbs, query