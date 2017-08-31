from google.appengine.ext import ndb
import model
from api import fields
import flask
import util

class Post(model.Base):
  user_key = ndb.KeyProperty(kind=model.User, required=True)
  title = ndb.StringProperty(required=True)
  content = ndb.StringProperty(default='')
  image_ids_string = ndb.StringProperty(default='')
  keywords = ndb.StringProperty(default='')
  blob_key = ndb.BlobKeyProperty()
  name = ndb.StringProperty()
  bucket_name = ndb.StringProperty()
  image_url = ndb.StringProperty(default='')
  content_type = ndb.StringProperty(default='')
  size = ndb.IntegerProperty(default=0)
  img_ids = ndb.IntegerProperty(repeated=True)
  recommender = ndb.StringProperty(default='')

  @ndb.ComputedProperty
  def size_human(self):
    return util.size_human(self.size or 0)

  @property
  def download_url(self):
    if self.key:
      return flask.url_for(
        'resource_download', resource_id=self.key.id(), _external=True
      )
    return None

  @property
  def view_url(self):
    if self.key:
      return flask.url_for(
        'resource_view', resource_id=self.key.id(), _external=True,
      )
    return None

  @property
  def serve_url(self):
    return '%s/serve/%s' % (flask.request.url_root[:-1], self.blob_key)

  FIELDS = {
    'bucket_name': fields.String,
    'content_type': fields.String,
    'download_url': fields.String,
    'image_url': fields.String,
    'name': fields.String,
    'serve_url': fields.String,
    'size': fields.Integer,
    'size_human': fields.String,
    'view_url': fields.String,
  }

  FIELDS.update(model.Base.FIELDS)

  @ndb.ComputedProperty
  def recommender_url(self):
    recommender = model.Recommender.query(model.Recommender.name == self.recommender).get()
    return flask.url_for(
      'recommender_view', recommender_id=recommender.key.id(), _external=True
    )

