
from __future__ import absolute_import

from google.appengine.api import images
from google.appengine.ext import blobstore
from google.appengine.ext import ndb
from google.appengine.api import search

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
def build_feature_dict(doc):
    return {
            'geometry': {
                'type': 'Point',
                'coordinates': [
                    doc.field('place').value.longitude,
                    doc.field('place').value.latitude
                ]
            },
            'type': 'Feature',
            'properties': {
                'name': doc.field('title').value,
                'description': doc.field('post_text').value,
                'image_url': doc.field('image_url').value,
                'location': doc.field('location').value,
                'keywords': doc.field('keywords').value,
                'recommender': doc.field('recommender').value,
                'docid': doc.field('docid').value,
                'website': doc.field('website').value,
                'address': doc.field('address').value
            }

        }




@api_v1.resource('/post/<string:query>', endpoint='api.posts')
class PostApi(flask_restful.Resource):
    def get(self, query):
        index = search.Index('spots')

        if query == '*':
            search_results = index.get_range(start_id="0", limit=20)
        else:
            search_results = index.search(query)

        features = []
        for doc in search_results:
            if (doc.field('place').value.longitude != 0.0 and
                    doc.field('place').value.latitude != 0.0):
                features.append(
                    build_feature_dict(doc)
                )

        dict = {
            "type": "FeatureCollection",
            "features": features
        }

        return util.jsonpify(dict)

# curl http://127.0.0.1:8080/api/v1/post/

# AIzaSyAbcMGMULgp5l0Trav2G3OseIrNGIxHDZk