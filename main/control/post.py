import flask
import auth
import model
from main import app
import flask_wtf
import wtforms
import util

class PostUpdateForm(flask_wtf.FlaskForm):
  title = wtforms.StringField('Name', [wtforms.validators.required()])
  content = wtforms.TextAreaField('Content', [wtforms.validators.required()])
  image = wtforms.StringField('Image', [wtforms.validators.optional()])
  keywords = wtforms.TextAreaField('Keywords', [wtforms.validators.optional()])


@app.route('/post/create/', methods=['GET', 'POST'])
@auth.login_required
def post_create():
  form = PostUpdateForm()
  if form.validate_on_submit():
    post_db = model.Post(
        user_key=auth.current_user_key(),
        title=form.title.data,
        content=form.content.data,
        image=form.image.data,
        keywords=form.keywords.data,
      )
    post_db.put()
    flask.flash('New post was successfully created!', category='success')
    return flask.redirect(flask.url_for('post_list', order='-created'))
  return flask.render_template(
      'post_update.html',
      html_class='post-create',
      title='Create Post',
      form=form,
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
      contact_db=post_db,
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
      'post_update.html',
      html_class='post-update',
      title=post_db.title,
      form=form,
      contact_db=post_db,
    )
