
import flask
import auth
import model
import flask_wtf
import wtforms
import util
import config
import json

from google.appengine.ext import blobstore
from google.appengine.ext import ndb

from main import app


def get_recommenders():
    q = model.Recommender.query().fetch()
    return [(recommender.name, recommender.name) for recommender in q]

def get_new_keywords(list):
    keywords = [keyword.keyword for keyword in model.Keyword.query().fetch()]
    return [item for item in list if item not in keywords]

class PostUpdateForm(flask_wtf.FlaskForm):
    title = wtforms.StringField('Name', [wtforms.validators.required()])
    content = wtforms.TextAreaField('Content', [wtforms.validators.required()])
    keywords = wtforms.StringField('Keywords', [wtforms.validators.required()])
    image = wtforms.StringField('Image', [wtforms.validators.optional()])
    recommender = wtforms.SelectField('Recommended By', choices=get_recommenders())
    website = wtforms.StringField('Website', [wtforms.validators.optional()])
    adress = wtforms.StringField('Adress', [wtforms.validators.optional()])


def get_img_url(first_img_id):
  if first_img_id is None:
      return ''

  resource = model.Resource.get_by_id(first_img_id)

  if resource is not None:
    return resource.image_url
  else:
      return ''


@app.route('/keywords')
def get_keywords():
    keywords = [keyword.keyword for keyword in model.Keyword.query().fetch()]
    return json.dumps(keywords)

@app.route('/post/create/', methods=['GET', 'POST'])
@auth.login_required            # todo: should be admin
def post_create():
  form = PostUpdateForm()

  if form.validate_on_submit():
    img_ids_list = [int(id) for id in form.image.data.split(';') if id != '']
    if len(img_ids_list) > 0:
        first_img_id = img_ids_list[0]
    else:
        first_img_id = None


    keyword_list = [k for k in form.keywords.data.split(',') if k != '' ]
    keywords = model.Keyword.query(model.Keyword.keyword.IN(keyword_list)).fetch()
    keywords_str = [keyword.keyword for keyword in keywords]
    new_keywords = [item for item in keyword_list if item not in keywords_str]

    post_db = model.Post(
      user_key=auth.current_user_key(),
      title=form.title.data,
      content=form.content.data,
      keywords=form.keywords.data,
      image_ids_string=form.image.data,
      img_ids=img_ids_list,
      image_url=get_img_url(first_img_id),
      recommender=form.recommender.data,
      recommender_lower=form.recommender.data.lower(),
      website=form.website.data,
      adress=form.adress.data,
      keyword_list=keyword_list,

    )

    post_db_key = post_db.put()

    for keyword in new_keywords:
        model.Keyword(keyword=keyword,
                      post_keys=[post_db_key]
                      ).put()

    for keyword in keywords:
        if keyword.keyword not in new_keywords:
            keyword.post_keys.append(post_db_key)
            keyword.put()


    flask.flash('New post was successfully created!', category='success')
    return flask.redirect(flask.url_for('post_list', order='-created'))

  return flask.render_template(
    'resource/resource_upload.html',
    title='Create New Post',
    html_class='resource-upload',
    get_upload_url=flask.url_for('api.resource.upload'),
    has_json=True,
    form=form,
    upload_url=blobstore.create_upload_url(
      flask.request.path,
      gs_bucket_name=config.CONFIG_DB.bucket_name or None,
    ),
  )


@app.route('/post/')
@auth.login_required
def post_list():
  post_dbs, post_cursor = model.Post.get_dbs(
      user_key=auth.current_user_key(),
    )
  return flask.render_template(
      'post_list.html',
      html_class='post-list',
      title='Post List',
      post_dbs=post_dbs,
      next_url=util.generate_next_url(post_cursor),
    )


def get_url_list(ids):
    return [get_img_url(id) for id in ids]


@app.route('/post/<int:post_id>/')
@auth.login_required
def post_view(post_id):
  post_db = model.Post.get_by_id(post_id)
  if not post_db or post_db.user_key != auth.current_user_key():
    flask.abort(404)
  return flask.render_template(
      'post_view.html',
      html_class='post-view',
      title=post_db.title,
      post_db=post_db,
      url_list=[get_img_url(id) for id in post_db.img_ids]
    )


@app.route('/post/<int:post_id>/update/', methods=['GET', 'POST'])
@auth.login_required
def post_update(post_id):
  post_db = model.Post.get_by_id(post_id)
  if not post_db or post_db.user_key != auth.current_user_key():
    flask.abort(404)
  form = PostUpdateForm(obj=post_db)
  if form.validate_on_submit():
    form.populate_obj(post_db)
    post_db.put()
    return flask.redirect(flask.url_for('post_list', order='-modified'))
  return flask.render_template(
      'resource/resource_upload.html',
      html_class='post-update',
      title=post_db.title,
      form=form,
      contact_db=post_db,
    )


@app.route('/post/q/<query>')
def post_list_q(query):
    keywords_to_search = query.split('+')

    keywords = model.Keyword.query(model.Keyword.keyword.IN(keywords_to_search)).fetch()
    post_keys = []
    for keyword in keywords:
        post_keys.extend(keyword.post_keys)

    post_dbs = ndb.get_multi(post_keys)

    return flask.render_template(
        'welcome.html',
        html_class='main-list',
        title='Post List',
        post_dbs=post_dbs,
        next_url=''
    )

@app.route('/post/r/<recommender>')
def list_recommenders(recommender):
    post_dbs = model.Post.query(model.Post.recommender_lower == recommender.lower()).fetch()
    print recommender.lower()
    print post_dbs
    return flask.render_template(
        'welcome.html',
        html_class='main-list',
        title='recommender',
        post_dbs=post_dbs,
        next_url=''
    )
