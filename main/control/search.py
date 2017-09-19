
import flask
import flask_wtf
import wtforms


from main import app


class SearchForm(flask_wtf.FlaskForm):
    search = wtforms.StringField('search')


@app.before_request
def before_request():
    flask.g.search_form = SearchForm()


@app.route('/search', methods=['POST'])
def search():
    query = flask.g.search_form.search.data.replace(',', '+')
    if not flask.g.search_form.validate_on_submit():
        return flask.redirect(flask.url_for('welcome'))
    return flask.redirect(flask.url_for('post_list_q', query=query))