
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


def parse_query(query):
    # Function parses the part of the URL that contains the queries
    # The '&' sign (or %26) marks the start of the Longitude and Latitude
    query.replace('%26', '&')
    query_split = query.split('&')
    print query_split
    if len(query_split) == 1:
        return {'query': query_split[0]}
    return {'query': query_split[0],
            'lon':float(query_split[1]),
            'lat':float(query_split[2])}

def get_query_options(query_dict, limit=10):
    if 'lat' in query_dict and 'lon' in query_dict:
        print 'lat ' + str(query_dict['lat'])
        print 'lon ' + str(query_dict['lon'])
        loc_expr = "distance(place, geopoint(%f, %f))" % (
            query_dict['lon'], query_dict['lat'])
        sortexpr = search.SortExpression(
                expression=loc_expr,
                direction=search.SortExpression.ASCENDING, default_value=45001)
        return search.QueryOptions(
                    limit=limit,
                    sort_options=search.SortOptions(expressions=[sortexpr]))
    else:
        return search.QueryOptions(
                    limit=limit
    )



@api_v1.resource('/post/<string:in_query>', endpoint='api.posts')
class PostApi(flask_restful.Resource):
    def get(self, in_query):
        index = search.Index('spots')
        query_dict = parse_query(in_query)
        if query_dict['query'] == '*' and 'lat' not in query_dict and 'lon' not in query_dict:
            search_results = index.get_range(start_id="0", limit=20)
        else:
            # search_results = index.search(query_dict['query'])
            search_query = search.Query(
                query_string=query_dict['query'].strip(),
                options=get_query_options(query_dict))
            search_results = index.search(search_query)

        features = []
        for doc in search_results:
            print doc
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

# curl http://127.0.0.1:8080/api/v1/post/a

# AIzaSyAbcMGMULgp5l0Trav2G3OseIrNGIxHDZk

# curl "http://127.0.0.1:8080/api/v1/post/a&-73.9858118&40.7701926"

# curl "http://localhost:3000/api/v1/post/*&40.770696199999996&-73.9858118"