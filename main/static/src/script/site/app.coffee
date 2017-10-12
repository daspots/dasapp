$ ->
  init_common()

$ -> $('html.auth').each ->
  init_auth()

$ -> $('html.user-list').each ->
  init_user_list()

$ -> $('html.user-merge').each ->
  init_user_merge()

$ -> $('html.resource-list').each ->
  init_resource_list()

$ -> $('html.resource-view').each ->
  init_resource_view()

$ -> $('html.post-create').each ->
  init_resource_upload()

$ -> $('html.recommender-create').each ->
  init_resource_upload()

