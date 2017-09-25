from google.appengine.ext import ndb
import model


class Keyword(model.Base):
  keyword = ndb.StringProperty(required=True)
  post_keys = ndb.KeyProperty(kind=model.Post, repeated=True)


  @ndb.ComputedProperty
  def nr_posts(self):
    return len(self.post_keys)