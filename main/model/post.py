from google.appengine.ext import ndb
import model


class Post(model.Base):
  user_key = ndb.KeyProperty(kind=model.User, required=True)
  title = ndb.StringProperty(required=True)
  content = ndb.StringProperty(default='')
  image = ndb.StringProperty(default='')
  keywords = ndb.StringProperty(default='')

