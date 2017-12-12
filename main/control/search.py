
import flask
import flask_wtf
import wtforms
import model
from google.appengine.ext import ndb

from helpers import add_starred_to_posts
from main import app
from google.appengine.api import search

class SearchForm(flask_wtf.FlaskForm):
    search = wtforms.StringField('search')

class SearchFormForSearchPage(flask_wtf.FlaskForm):
    search_page = wtforms.StringField('search_page')

@app.before_request
def before_request():
    flask.g.search_form = SearchForm()


@app.route('/search', methods=['POST'])
def search_page():
    form = SearchFormForSearchPage()
    if form.search_page.data:
        # the search request comes from the mobile search page
        query = form.search_page.data.replace(',', '+')
    else:
        # the search request comes from the search bar in the menu
        query = flask.g.search_form.search.data.replace(',', '+')
        if not flask.g.search_form.validate_on_submit():
            return flask.redirect(flask.url_for('welcome'))
    return flask.redirect(flask.url_for('post_list_q', query=query))

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


@app.route('/post/q/')
def no_posts_found():
    keyword_dbs = model.Keyword.query().order(-model.Keyword.nr_posts).fetch()
    form = SearchFormForSearchPage()
    return flask.render_template('no_post_found.html',
                                 html_class='main-list',
                                 title='No Posts Found',
                                 error_message='Unfortunately, your search didn\'t return any results...',
                                 keyword_dbs=keyword_dbs,
                                 form=form,
                                 )


@app.route('/post/q/<query>')
def post_list_q(query):

    query = query.replace('+', ' ').replace(',', '')
    index = search.Index('spots')
    search_results = index.search(query)

    all_docs = [ndb.Key('Post', int(doc.doc_id)) for doc in search_results]

    post_dbs = [post for post in ndb.get_multi(all_docs) if post is not None]
    post_dbs = add_starred_to_posts(post_dbs)

    if len(post_dbs) == 0:
        return flask.redirect(flask.url_for('no_posts_found'))

    return flask.render_template(
        'welcome.html',
        html_class='search-list',
        title='Post List',
        post_dbs=post_dbs,
        next_url='',
        search_query=query
    )
