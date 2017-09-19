from __future__ import absolute_import

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
@api_v1.resource('/follow/<int:recommender_key>/', endpoint='api.follow')
class FollowApi(flask_restful.Resource):

  @auth.login_required
  def delete(self, recommender_key):
      recommender_db = model.Recommender.get_by_id(recommender_key)
      user_db = auth.current_user_key().get()

      following_dbs = model.Following.query(model.Following.recommender_key==recommender_db.key,
                                            model.Following.user_key==user_db.key).fetch()

      for following_db in following_dbs:
          following_db.key.delete()

      return 'succes!'

  @auth.login_required
  def put(self, recommender_key):
      recommender_db = model.Recommender.get_by_id(recommender_key)
      user_db = auth.current_user_key().get()

      following = model.Following(user_key=user_db.key, recommender_key=recommender_db.key)
      following_id = following.put()

      return util.jsonpify({'post_key': str(recommender_db.key.id),
                            'user_key': str(user_db.key.id),
                            'following_id': str(following_id)})



# curl http://127.0.0.1:8080/api/v1/star/4904028018311168/ -d "data={\"user_key\":\"5629499534213120\"}" -X PUT
# curl http://127.0.0.1:8080/api/v1/star/4904028018311168/ -X DELETE -v
