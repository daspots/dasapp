
import flask
import auth
import model
import flask_wtf
import wtforms
import util
import config
import json
import logging


from google.appengine.ext import blobstore
from google.appengine.ext import ndb
from google.appengine.api import search
from google.appengine.api import urlfetch

from helpers import add_starred_to_posts
from settings import GEOCODING_API_KEY
from main import app


# import requests_toolbelt.adapters.appengine
# requests_toolbelt.adapters.appengine.monkeypatch()


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
    location_keywords = wtforms.StringField('Location(s)', [wtforms.validators.required()])
    image = wtforms.StringField('Image', [wtforms.validators.optional()])
    recommender = wtforms.SelectField('Recommended By', choices=[])
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


def create_new_keywords(new_keywords, post_db_key, is_location=False):
    for keyword in new_keywords:
        model.Keyword(keyword=keyword,
                      post_keys=[post_db_key],
                      is_location=is_location,
                      ).put()


def split_keywords(keywords):
    return [k for k in keywords.data.split(',') if k != '']


def get_lat_long(address):
    url = 'https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s' % (address, GEOCODING_API_KEY)
    result = urlfetch.fetch(url.replace(' ', '+'))
    geocode_result = json.loads(result.content)
    lat_long = geocode_result['results'][0]['geometry']['location']
    return (lat_long['lat'], lat_long['lng'])


def create_document(post_db, id):

    try:
        lat, long = get_lat_long(post_db.adress)
    except:
        lat, long = (0, 0)

    document = search.Document(
        # Setting the doc_id is optional. If omitted, the search service will
        # create an identifier.
        doc_id=str(id),
        fields=[
            search.TextField(name='post_text', value=post_db.content),
            search.TextField(name='title', value=post_db.title),
            search.TextField(name='keywords', value=post_db.keywords),
            search.TextField(name='location', value=post_db.location_keywords),
            search.TextField(name='recommender', value=post_db.recommender),
            search.AtomField(name='website', value=post_db.website),
            search.AtomField(name='image_url', value=post_db.image_url),
            search.TextField(name='address', value=post_db.adress),
            search.AtomField(name='docid', value=str(id)),
            search.GeoField(name='place', value=search.GeoPoint(latitude=lat, longitude=long))
        ])
    return document


def add_document_to_index(document):
    index = search.Index('spots')
    results = index.put(document)
    document_ids = [document.id for document in results]
    return document_ids


@app.route('/post/create/', methods=['GET', 'POST'])
@auth.admin_required
def post_create():
  form = PostUpdateForm()
  form.recommender.choices = get_recommenders()

  if form.validate_on_submit():
    img_ids_list = [int(id) for id in form.image.data.split(';') if id != '']
    if len(img_ids_list) > 0:
        first_img_id = img_ids_list[0]
    else:
        first_img_id = None

    keyword_list = split_keywords(form.keywords)
    loc_keyword_list = split_keywords(form.location_keywords)

    # differentiate between existing and new keywords
    existing_keywords = model.Keyword.query(
            model.Keyword.keyword.IN(keyword_list + loc_keyword_list)
        ).fetch()
    existing_keywords_str = [keyword.keyword for keyword in existing_keywords]

    new_keywords = [item for item in keyword_list if item not in existing_keywords_str]
    new_loc_keywords = [item for item in loc_keyword_list if item not in existing_keywords_str]

    post_db = model.Post(
      user_key=auth.current_user_key(),
      title=form.title.data,
      content=form.content.data,
      keywords=form.keywords.data,
      location_keywords=form.location_keywords.data,
      image_ids_string=form.image.data,
      img_ids=img_ids_list,
      image_url=get_img_url(first_img_id),
      recommender=form.recommender.data,
      recommender_lower=form.recommender.data.lower(),
      website=form.website.data,
      adress=form.adress.data,
      keyword_list=keyword_list,
      location_keyword_list=loc_keyword_list,

    )

    post_db_key = post_db.put()

    create_new_keywords(new_keywords, post_db_key, is_location=False)
    create_new_keywords(new_loc_keywords, post_db_key, is_location=True)

    add_to_keywords(existing_keywords, new_keywords + new_loc_keywords, post_db_key)

    # add content to index:
    search_document = create_document(post_db, post_db_key.id())
    _ = add_document_to_index(search_document)

    flask.flash('New post was successfully created!', category='success')
    return flask.redirect(flask.url_for('post_list', order='-created'))


  return flask.render_template(
    'post_create.html',
    title='Create New Post',
    html_class='post-create',
    get_upload_url=flask.url_for('api.resource.upload'),
    has_json=True,
    form=form,
    upload_url=blobstore.create_upload_url(
      flask.request.path,
      gs_bucket_name=config.CONFIG_DB.bucket_name or None,
    ),
  )


def add_to_keywords(existing_keywords, all_new_keywords, post_db_key):
    # Add post to existing keywords
    for keyword in existing_keywords:
        if keyword.keyword not in all_new_keywords:
            keyword.post_keys.append(post_db_key)
            keyword.put()


@app.route('/post/<int:post_id>/update/', methods=['GET', 'POST'])
@auth.admin_required
def post_update(post_id):
  post_db = model.Post.get_by_id(post_id)
  if not post_db:
      # or post_db.user_key != auth.current_user_key():
    flask.abort(404)
  logging.warning('updating' + str(post_id))
  form = PostUpdateForm(obj=post_db)
  form.recommender.choices = get_recommenders()


  if form.validate_on_submit():
    form.populate_obj(post_db)
    post_db.recommender_lower = form.recommender.data.lower()

    post_db.keyword_list = split_keywords(form.keywords)
    post_db.location_keyword_list = split_keywords(form.location_keywords)

    # differentiate between existing and new keywords
    existing_keywords = model.Keyword.query(
        model.Keyword.keyword.IN(post_db.keyword_list + post_db.location_keyword_list)
    ).fetch()
    existing_keywords_str = [keyword.keyword for keyword in existing_keywords]

    new_keywords = [item for item in post_db.keyword_list if item not in existing_keywords_str]
    new_loc_keywords = [item for item in post_db.location_keyword_list if item not in existing_keywords_str]

    post_db_key = post_db.put()

    create_new_keywords(new_keywords, post_db_key, is_location=False)
    create_new_keywords(new_loc_keywords, post_db_key, is_location=True)

    # Add post to existing keywords
    add_to_keywords(existing_keywords, new_keywords + new_loc_keywords, post_db_key)

    # Delete and recreate document in search index
    search.Index('spots').delete(str(post_id))
    search_document = create_document(post_db, post_db_key.id())
    _ = add_document_to_index(search_document)

    flask.flash('Post was successfully updated!', category='success')
    return flask.redirect(flask.url_for('post_list', order='-created'))

  return flask.render_template(
      'post_create.html',
      html_class='post-update',
      title=post_db.title,
      form=form,
      post_db=post_db,
    )


@app.route('/post/')
@auth.admin_required
def post_list():
  post_dbs, post_cursor = model.Post.get_dbs(
      query=model.Post.query(),
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


@app.route('/post/<int:post_id>/remove/', methods=['GET', 'POST'])
@auth.admin_required
def post_remove(post_id):
    post = model.Post.get_by_id(post_id)
    # First remove all related images
    for resource_id in post.img_ids:
        resource = model.Resource.get_by_id(resource_id)
        resource.key.delete()

    # Clean up the keywords
    keywords = model.Keyword.query(model.Keyword.keyword.IN(post.keyword_list)).fetch()
    for keyword in keywords:
        keyword.post_keys = [p_key for p_key in keyword.post_keys if p_key != post.key]
        if len(keyword.post_keys) == 0:
            keyword.key.delete()
        else:
            keyword.put()

    # Remove the search index
    index = search.Index('spots')
    index.delete(str(post_id))

    post.key.delete()
    flask.flash('Post removed', category='success')
    return flask.redirect(flask.url_for('post_list', order='-created'))




@app.route('/post/<int:post_id>/')
@auth.admin_required
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

@app.route('/post/u')
@auth.login_required
def post_list_u():
    user_db = auth.current_user_key().get()
    stars = model.Star.query(model.Star.user_key == user_db.key).fetch()
    post_dbs = [star.post_key.get() for star in stars]
    post_dbs = add_starred_to_posts(post_dbs)
    if len(post_dbs) == 0:
        return flask.render_template('no_post_found.html',
                                     html_class='starred',
                                     title='No Posts Found',
                                     error_message='You have no saved venues, click the star next to a post to save it'
                                                   ' to your saved venues.'
                                     )
    return flask.render_template(
        'welcome.html',
        html_class='starred',
        title='Starred Venues',
        post_dbs=post_dbs,
        next_url=''
    )

@app.route('/maptest')
def map():
    return flask.render_template('map.html')