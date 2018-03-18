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

class GuideUpdateForm(flask_wtf.FlaskForm):
  name = wtforms.StringField('Name', [wtforms.validators.required()])
  bio = wtforms.TextAreaField('Bio', [wtforms.validators.required()])
  website_url = wtforms.TextAreaField('Website', [wtforms.validators.optional()])
  image = wtforms.StringField('Image', [wtforms.validators.optional()])


###############################################################################
# Create Guide
###############################################################################
def get_img_url(id):
  if id is None:
    return ''

  resource = model.Resource.get_by_id(id)

  if resource is not None:
    return resource.image_url
  else:
    return ''

@app.route('/guide/create/', methods=('GET', 'POST'))
@auth.admin_required
def guide_create():
  form = GuideUpdateForm()

  if form.validate_on_submit():
    img_ids_list = [int(id) for id in form.image.data.split(';') if id != '']
    if len(img_ids_list) > 0:
      first_img_id = img_ids_list[0]
    else:
      first_img_id = None


    guide_db = model.Guide(
      user_key=auth.current_user_key(),
      name=form.name.data,
      bio=form.bio.data,
      website_url=form.website_url.data,
      image_ids_string=form.image.data,
      img_ids = img_ids_list,
      image_url=get_img_url(first_img_id),
      name_lower=form.name.data.lower(),

    )
    guide_db.put()
    flask.flash('New Guide was successfully created!', category='success')
    return flask.redirect(flask.url_for('guide_list', order='-created'))

  return flask.render_template(
    'guide/guide_create.html',
    title='Create Guide',
    html_class='guide-create',
    get_upload_url=flask.url_for('api.resource.upload'),
    has_json=True,
    form=form,

    upload_url=blobstore.create_upload_url(
      flask.request.path,
      gs_bucket_name=config.CONFIG_DB.bucket_name or None,
    ),
  )



@app.route('/guide/')
@auth.admin_required
def guide_list():
    guide_dbs, post_cursor = model.Guide.get_dbs(
        query=model.Guide.query(),
    )
    return flask.render_template(
      'guide/guide_list.html',
      html_class='guide-list',
      title='Guide List',
      guide_dbs=guide_dbs,
      next_url=util.generate_next_url(post_cursor),
    )

def get_url_list(ids):
    return [get_img_url(id) for id in ids]

@app.route('/guide/<int:guide_id>/')
def guide_view(guide_id):
    guide_db = model.Guide.get_by_id(guide_id)
    bootstrap_class_list = get_bootstrap_class_list(guide_db)
    follow_text = get_follow_text(bootstrap_class_list)

    if not guide_db:
        return flask.render_template('guide/guide_view.html')
    return flask.render_template(
      'guide/guide_view.html',
      html_class='guide-view',
      title=guide_db.name,
      guide_db=guide_db,
      url_list=[get_img_url(id) for id in guide_db.img_ids],
      bootstrap_class_list=bootstrap_class_list,
      follow_text=follow_text,

    )


def get_follow_text(class_list):
    if 'label-success' in class_list:
        return 'FOLLOWING'
    return 'FOLLOW'


def get_bootstrap_class_list(guide_db):
    bootstrap_class_list = ['label', 'label-pill']
    # Get the classes needed for the "follow/following label"
    if auth.is_logged_in():

        user_db = auth.current_user_key().get()
        following_dbs = model.Following.query(model.Following.guide_key == guide_db.key,
                                              model.Following.user_key == user_db.key).fetch()
        if following_dbs:
            bootstrap_class_list.append('label-success')

        else:
            bootstrap_class_list.append('label-default')
    else:
        bootstrap_class_list.extend(['label-default', 'not-logged-in'])
    return ' '.join(bootstrap_class_list)


@app.route('/guide/<int:guide_id>/update/', methods=['GET', 'POST'])
@auth.admin_required
def guide_update(guide_id):
    guide_db = model.Guide.get_by_id(guide_id)

    if not guide_db:
            # or guide_db.user_key != auth.current_user_key():
        flask.abort(404)
    form = GuideUpdateForm(obj=guide_db)
    if form.validate_on_submit():
        form.populate_obj(guide_db)
        guide_db.name_lower = form.name.data.lower()

        guide_db.put()
        return flask.redirect(flask.url_for('guide_list', order='-modified'))

    return flask.render_template(
          'guide/guide_create.html',
          html_class='guide-update',
          title=guide_db.name,
          form=form,
          guide_db=guide_db,
        )


@app.route('/guide/<int:guide_id>/remove/', methods=['GET', 'POST'])
@auth.admin_required
def guide_remove(guide_id):
    guide = model.Guide.get_by_id(guide_id)
    guide.key.delete()
    flask.flash('Guide removed', category='success')

    return flask.redirect(flask.url_for('guide_list', order='-created'))

@app.route('/guide_overview')
def guide_overview():
    guide_dbs, post_cursor = model.Guide.get_dbs(
        query=model.Guide.query().order(-model.Guide.created),
    )
    
    return flask.render_template(
        'guide/guide_overview.html',
        html_class='guide-overview',
        title='All our experts',
        guide_dbs=guide_dbs,
        next_url=''
        # util.generate_next_url(post_cursor),
    )


