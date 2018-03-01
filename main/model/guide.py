from google.appengine.ext import ndb
import model
from api import fields
import flask
import util


class Guide(model.Base):
  user_key = ndb.KeyProperty(kind=model.User, required=True)
  name = ndb.StringProperty(required=True)
  bio = ndb.StringProperty(default='')
  image_ids_string = ndb.StringProperty(default='')
  website_url = ndb.StringProperty(default='')
  image_url = ndb.StringProperty(default='')
  img_ids = ndb.IntegerProperty(repeated=True)
  name_lower = ndb.StringProperty(required=True)
  following = ndb.BooleanProperty(default=False)