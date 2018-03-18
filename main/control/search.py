
import config
import flask
import flask_wtf
import model
import wtforms
import util

from main import app
from google.appengine.api import search
from google.appengine.ext import ndb
from helpers import add_starred_to_posts


class SearchForm(flask_wtf.FlaskForm):
    search = wtforms.StringField('search')

class SearchFormForSearchPage(flask_wtf.FlaskForm):
    search_page = wtforms.StringField('search_page')

@app.before_request
def before_request():
    flask.g.search_form = SearchForm()


def build_query(query, city):
    query = query.replace('%20', ' ')
    if city in query:    # City is already in query
            return query
    if len(query.strip()) == 0:
        return ''
    return '%s %s' % (query, city)


@app.route('/<city>/search', methods=['POST'])
def search_page(city):
    form = SearchFormForSearchPage()
    if form.search_page.data:
        # the search request comes from the mobile search page
        query = form.search_page.data.replace(',', '+')
    else:
        # the search request comes from the search bar in the menu
        query = flask.g.search_form.search.data.replace(',', '+')
        if not flask.g.search_form.validate_on_submit():
            return flask.redirect(flask.url_for('welcome'))
    query = build_query(query, city)
    return flask.redirect(flask.url_for('post_list_q',
                                        query=query,
                                        city=city))

@app.route('/search', methods=['GET'])
def search_mobile():
    keyword_dbs = model.Keyword.query().order(-model.Keyword.nr_posts).fetch()
    form = SearchFormForSearchPage()
    return flask.render_template(
        'search/search_keywords.html',
        html_class='search-keywords',
        title='Search Keywords',
        keyword_dbs=keyword_dbs,
        form=form,
    )


@app.route('/post/q/<city>')
def no_posts_found(city):
    keyword_dbs = model.Keyword.query().order(-model.Keyword.nr_posts).fetch()
    form = SearchFormForSearchPage()
    return flask.render_template('no_post_found.html',
                                 html_class='main-list',
                                 title='No Posts Found',
                                 error_message='Unfortunately, your search didn\'t return any results...',
                                 keyword_dbs=keyword_dbs,
                                 form=form,
                                 city=city
                                 )


@app.route('/<city>/post/q/<query>/')
def post_list_q(query, city):

    post_dbs, query = get_q_and_postdbs(query)

    if len(post_dbs) == 0:
        return flask.redirect(flask.url_for('no_posts_found', city=city))

    return flask.render_template(
        'welcome.html',
        html_class='search-list',
        title='Post List',
        post_dbs=post_dbs,
        next_url='',
        search_query=query,
        city=city
    )


def get_q_and_postdbs(query):
    query = query.replace('+', ' ').replace(',', '')
    index = search.Index('spots')
    search_results = index.search(query)
    all_docs = [ndb.Key('Post', int(doc.doc_id)) for doc in search_results]
    post_dbs = [post for post in ndb.get_multi(all_docs) if post is not None]
    post_dbs = add_starred_to_posts(post_dbs)
    return post_dbs, query