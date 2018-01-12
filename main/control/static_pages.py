# coding: utf-8

import flask
import auth
import model
import config
import util

from main import app

@app.route('/about')
def about():
    return flask.render_template(
      'about.html',
        html_class='main-list',

    )

@app.route('/contact')
def contact():
    return flask.render_template(
      'contact.html',
        html_class='main-list',
      )

@app.route('/newsletter')
def newsletter():
    return flask.render_template(
      'newsletter.html',
        html_class='main-list',
      )

@app.route('/work_with_us')
def work_with_us():
    return flask.render_template(
      'work_with_us.html',
        html_class='main-list',
      )

@app.route('/new_feature')
def new_feature():
    return flask.render_template(
      'new_feature.html',
        html_class='main-list',
      )

@app.route('/stories')
def stories():
    return flask.render_template(
      'stories.html',
        html_class='main-list',
      ) 
 
@app.route('/spots')
def spots():
    return flask.render_template(
      'spots.html',
        html_class='main-list',
      ) 
