
from __future__ import absolute_import

from google.appengine.api import images
from google.appengine.ext import blobstore
from google.appengine.ext import ndb
import flask
import flask_restful
import werkzeug

from api import helpers
import auth
import config
import model
import util
import json
from main import api_v1


###############################################################################
# Endpoints
###############################################################################
@api_v1.resource('/star/<int:post_key>/', endpoint='api.star')
class StarApi(flask_restful.Resource):

  @auth.login_required
  def delete(self, post_key):
      post_db = model.Post.get_by_id(post_key)
      user_db = auth.current_user_key().get()

      stars = model.Star.query(model.Star.post_key==post_db.key, model.Star.user_key==user_db.key).fetch()

      for star in stars:
          star.key.delete()

      return str(stars)

  @auth.login_required
  def put(self, post_key):
      post_db = model.Post.get_by_id(post_key)
      user_db = auth.current_user_key().get()

      star = model.Star(user_key=user_db.key, post_key=post_db.key)
      star_id = star.put()

      return util.jsonpify({'post_key': str(post_db.key.id),
                            'user_key': str(user_db.key.id),
                            'star': str(star_id)})



# curl http://127.0.0.1:8080/api/v1/star/4904028018311168/ -d "data={\"user_key\":\"5629499534213120\"}" -X PUT
# curl http://127.0.0.1:8080/api/v1/star/4904028018311168/ -X DELETE -v
