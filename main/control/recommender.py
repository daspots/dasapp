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

class RecommenderUpdateForm(flask_wtf.FlaskForm):
  name = wtforms.StringField('Name', [wtforms.validators.required()])
  bio = wtforms.TextAreaField('Bio', [wtforms.validators.required()])
  website_url = wtforms.TextAreaField('Website', [wtforms.validators.optional()])
  image = wtforms.StringField('Image', [wtforms.validators.optional()])


###############################################################################
# Create Recommender
###############################################################################
def get_img_url(id):
  if id is None:
    return ''

  resource = model.Resource.get_by_id(id)

  if resource is not None:
    return resource.image_url
  else:
    return ''

@app.route('/recommender/create/', methods=('GET', 'POST'))
@auth.admin_required
def recommender_create():
  form = RecommenderUpdateForm()

  if form.validate_on_submit():
    img_ids_list = [int(id) for id in form.image.data.split(';') if id != '']
    if len(img_ids_list) > 0:
      first_img_id = img_ids_list[0]
    else:
      first_img_id = None


    recommender_db = model.Recommender(
      user_key=auth.current_user_key(),
      name=form.name.data,
      bio=form.bio.data,
      website_url=form.website_url.data,
      image_ids_string=form.image.data,
      img_ids = img_ids_list,
      image_url=get_img_url(first_img_id),
      name_lower=form.name.data.lower(),

    )
    recommender_db.put()
    flask.flash('New Recommender was successfully created!', category='success')
    return flask.redirect(flask.url_for('recommender_list', order='-created'))

  return flask.render_template(
    'recommender/recommender_create.html',
    title='Create Recommender',
    html_class='recommender-create',
    get_upload_url=flask.url_for('api.resource.upload'),
    has_json=True,
    form=form,

    upload_url=blobstore.create_upload_url(
      flask.request.path,
      gs_bucket_name=config.CONFIG_DB.bucket_name or None,
    ),
  )



@app.route('/recommender/')
@auth.admin_required
def recommender_list():
    recommender_dbs, post_cursor = model.Recommender.get_dbs(
        query=model.Recommender.query(),
    )
    return flask.render_template(
      'recommender/recommender_list.html',
      html_class='recommender-list',
      title='Recommender List',
      recommender_dbs=recommender_dbs,
      next_url=util.generate_next_url(post_cursor),
    )

def get_url_list(ids):
    return [get_img_url(id) for id in ids]

@app.route('/recommender/<int:recommender_id>/')
def recommender_view(recommender_id):
    recommender_db = model.Recommender.get_by_id(recommender_id)
    bootstrap_class_list = get_bootstrap_class_list(recommender_db)
    follow_text = get_follow_text(bootstrap_class_list)

    if not recommender_db:
        return flask.render_template('recommender/recommender_view.html')
    return flask.render_template(
      'recommender/recommender_view.html',
      html_class='recommender-view',
      title=recommender_db.name,
      recommender_db=recommender_db,
      url_list=[get_img_url(id) for id in recommender_db.img_ids],
      bootstrap_class_list=bootstrap_class_list,
      follow_text=follow_text,

    )


def get_follow_text(class_list):
    if 'label-success' in class_list:
        return 'FOLLOWING'
    return 'FOLLOW'


def get_bootstrap_class_list(recommender_db):
    bootstrap_class_list = ['label', 'label-pill']
    # Get the classes needed for the "follow/following label"
    if auth.is_logged_in():

        user_db = auth.current_user_key().get()
        following_dbs = model.Following.query(model.Following.recommender_key == recommender_db.key,
                                              model.Following.user_key == user_db.key).fetch()
        if following_dbs:
            bootstrap_class_list.append('label-success')

        else:
            bootstrap_class_list.append('label-default')
    else:
        bootstrap_class_list.extend(['label-default', 'not-logged-in'])
    return ' '.join(bootstrap_class_list)


@app.route('/recommender/<int:recommender_id>/update/', methods=['GET', 'POST'])
@auth.admin_required
def recommender_update(recommender_id):
    recommender_db = model.Recommender.get_by_id(recommender_id)

    if not recommender_db:
            # or recommender_db.user_key != auth.current_user_key():
        flask.abort(404)
    form = RecommenderUpdateForm(obj=recommender_db)
    if form.validate_on_submit():
        form.populate_obj(recommender_db)
        recommender_db.name_lower = form.name.data.lower()

        recommender_db.put()
        return flask.redirect(flask.url_for('recommender_list', order='-modified'))

    return flask.render_template(
          'recommender/recommender_create.html',
          html_class='recommender-update',
          title=recommender_db.name,
          form=form,
          recommender_db=recommender_db,
        )


@app.route('/recommender/<int:recommender_id>/remove/', methods=['GET', 'POST'])
@auth.admin_required
def recommender_remove(recommender_id):
    recommender = model.Recommender.get_by_id(recommender_id)
    recommender.key.delete()
    flask.flash('Recommender removed', category='success')

    return flask.redirect(flask.url_for('recommender_list', order='-created'))

@app.route('/recommender_overview')
def recommender_overview():
    recommender_dbs, post_cursor = model.Recommender.get_dbs(
        query=model.Recommender.query().order(-model.Recommender.created),
    )
    for recommender_db in recommender_dbs:
        recommender_db.bootstrap_class_list = get_bootstrap_class_list(recommender_db)
        recommender_db.follow_text = get_follow_text(recommender_db.bootstrap_class_list)

    return flask.render_template(
        'recommender/recommender_overview.html',
        html_class='recommender-overview',
        title='All our experts',
        recommender_dbs=recommender_dbs,
        next_url=''
        # util.generate_next_url(post_cursor),
    )


