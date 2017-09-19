from google.appengine.ext import ndb
import model


class Following(model.Base):
  user_key = ndb.KeyProperty(kind=model.User)
  recommender_key = ndb.KeyProperty(kind=model.Recommender)
