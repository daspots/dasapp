import urllib

from google.appengine.ext import blobstore
import flask
import flask_wtf
import wtforms

import auth
import config
import model
import util

from main import app

class PostUpdateForm(flask_wtf.FlaskForm):
  title = wtforms.StringField('Name', [wtforms.validators.required()])
  content = wtforms.TextAreaField('Content', [wtforms.validators.required()])
  keywords = wtforms.TextAreaField('Keywords', [wtforms.validators.optional()])
  image = wtforms.StringField('Image', [wtforms.validators.required()])


###############################################################################
# Upload
###############################################################################
def get_img_url(first_img_id):

  # resource = model.Resource.query(model.Resource.get_by_id == img_name).get()
  resource = model.Resource.get_by_id(first_img_id)

  return resource.image_url

@app.route('/resource/upload/', methods=['GET', 'POST'])
@auth.login_required
def resource_upload():
  form = PostUpdateForm()

  if form.validate_on_submit():
    img_ids_list = [int(id) for id in form.image.data.split(';') if id != '']

    post_db = model.Post(
      user_key=auth.current_user_key(),
      title=form.title.data,
      content=form.content.data,
      keywords=form.keywords.data,
      image_ids_string=form.image.data,
      img_ids = img_ids_list,
      image_url=get_img_url(img_ids_list[0])

    )
    post_db.put()
    flask.flash('New post was successfully created!', category='success')
    return flask.redirect(flask.url_for('post_list', order='-created'))

  return flask.render_template(
    'resource/resource_upload.html',
    title='Resource Upload',
    html_class='resource-upload',
    get_upload_url=flask.url_for('api.resource.upload'),
    has_json=True,
    form=form,
    upload_url=blobstore.create_upload_url(
      flask.request.path,
      gs_bucket_name=config.CONFIG_DB.bucket_name or None,
    ),
  )


###############################################################################
# List
###############################################################################
@app.route('/resource/', endpoint='resource_list')
@auth.login_required
def resource_list():
  resource_dbs, resource_cursor = auth.current_user_db().get_resource_dbs()

  return flask.render_template(
    'resource/resource_list.html',
    html_class='resource-list',
    title='Resource List',
    resource_dbs=resource_dbs,
    next_url=util.generate_next_url(resource_cursor),
    api_url=flask.url_for('api.resource.list'),
  )


###############################################################################
# View
###############################################################################
@app.route('/resource/<int:resource_id>/', endpoint='resource_view')
@auth.login_required
def resource_view(resource_id):
  resource_db = model.Resource.get_by_id(resource_id)

  if not resource_db or resource_db.user_key != auth.current_user_key():
    return flask.abort(404)

  return flask.render_template(
    'resource/resource_view.html',
    html_class='resource-view',
    title='%s' % (resource_db.name),
    resource_db=resource_db,
    api_url=flask.url_for('api.resource', key=resource_db.key.urlsafe()),
  )


###############################################################################
# Update
###############################################################################
class ResourceUpdateForm(flask_wtf.FlaskForm):
  name = wtforms.TextField('Name', [wtforms.validators.required()])


@app.route('/resource/<int:resource_id>/update/', methods=['GET', 'POST'], endpoint='resource_update')
@auth.login_required
def resource_update(resource_id):
  resource_db = model.Resource.get_by_id(resource_id)

  if not resource_db or resource_db.user_key != auth.current_user_key():
    return flask.abort(404)

  form = ResourceUpdateForm(obj=resource_db)

  if form.validate_on_submit():
    form.populate_obj(resource_db)
    resource_db.put()
    return flask.redirect(flask.url_for(
      'resource_view', resource_id=resource_db.key.id(),
    ))

  return flask.render_template(
    'resource/resource_update.html',
    html_class='resource-update',
    title='%s' % (resource_db.name),
    resource_db=resource_db,
    form=form,
    api_url=flask.url_for('api.resource', key=resource_db.key.urlsafe()),
  )


###############################################################################
# Download
###############################################################################
@app.route('/resource/<int:resource_id>/download/')
@auth.login_required
def resource_download(resource_id):
  resource_db = model.Resource.get_by_id(resource_id)
  if not resource_db or resource_db.user_key != auth.current_user_key():
    return flask.abort(404)
  name = urllib.quote(resource_db.name.encode('utf-8'))
  url = '/serve/%s?save_as=%s' % (resource_db.blob_key, name)
  return flask.redirect(url)