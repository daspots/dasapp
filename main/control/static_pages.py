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
 
