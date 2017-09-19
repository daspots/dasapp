from google.appengine.ext import ndb
import model


class Star(model.Base):
  user_key = ndb.KeyProperty(kind=model.User)
  post_key = ndb.KeyProperty(kind=model.Post)
