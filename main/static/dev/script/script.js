(function() {
  window.api_call = function(method, url, params, data, callback) {
    var k, separator, v;
    callback = callback || data || params;
    data = data || params;
    if (arguments.length === 4) {
      data = void 0;
    }
    if (arguments.length === 3) {
      params = void 0;
      data = void 0;
    }
    params = params || {};
    for (k in params) {
      v = params[k];
      if (v == null) {
        delete params[k];
      }
    }
    separator = url.search('\\?') >= 0 ? '&' : '?';
    return $.ajax({
      type: method,
      url: "" + url + separator + ($.param(params)),
      contentType: 'application/json',
      accepts: 'application/json',
      dataType: 'json',
      data: data ? JSON.stringify(data) : void 0,
      success: function(data) {
        var more;
        if (data.status === 'success') {
          more = void 0;
          if (data.next_url) {
            more = function(callback) {
              return api_call(method, data.next_url, {}, callback);
            };
          }
          return typeof callback === "function" ? callback(void 0, data.result, more) : void 0;
        } else {
          return typeof callback === "function" ? callback(data) : void 0;
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        var e, error;
        error = {
          error_code: 'ajax_error',
          text_status: textStatus,
          error_thrown: errorThrown,
          jqXHR: jqXHR
        };
        try {
          if (jqXHR.responseText) {
            error = $.parseJSON(jqXHR.responseText);
          }
        } catch (error1) {
          e = error1;
          error = error;
        }
        LOG('api_call error', error);
        return typeof callback === "function" ? callback(error) : void 0;
      }
    });
  };

}).call(this);

(function() {
  var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  (function() {
    return window.FileUploader = (function() {
      function FileUploader(options) {
        var ref, xhr;
        this.options = options;
        this.upload_file = bind(this.upload_file, this);
        this.process_files = bind(this.process_files, this);
        this.get_upload_urls = bind(this.get_upload_urls, this);
        this.upload_files = bind(this.upload_files, this);
        this.file_select_handler = bind(this.file_select_handler, this);
        this.file_drag_hover = bind(this.file_drag_hover, this);
        this.upload_handler = this.options.upload_handler;
        this.selector = this.options.selector;
        this.drop_area = this.options.drop_area;
        this.upload_url = this.options.upload_url || ("/api/v1" + window.location.pathname);
        this.confirm_message = this.options.confirm_message || 'Files are still being uploaded.';
        this.allowed_types = this.options.allowed_types;
        this.max_size = this.options.max_size;
        this.active_files = 0;
        if ((ref = this.selector) != null) {
          ref.bind('change', (function(_this) {
            return function(e) {
              return _this.file_select_handler(e);
            };
          })(this));
        }
        xhr = new XMLHttpRequest();
        if ((this.drop_area != null) && xhr.upload) {
          this.drop_area.on('dragover', this.file_drag_hover);
          this.drop_area.on('dragleave', this.file_drag_hover);
          this.drop_area.on('drop', (function(_this) {
            return function(e) {
              return _this.file_select_handler(e);
            };
          })(this));
          this.drop_area.show();
        }
        window.onbeforeunload = (function(_this) {
          return function() {
            if ((_this.confirm_message != null) && _this.active_files > 0) {
              return _this.confirm_message;
            }
          };
        })(this);
      }

      FileUploader.prototype.file_drag_hover = function(e) {
        if (this.drop_area == null) {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        if (e.type === 'dragover') {
          return this.drop_area.addClass('drag-hover');
        } else {
          return this.drop_area.removeClass('drag-hover');
        }
      };

      FileUploader.prototype.file_select_handler = function(e) {
        var files, ref, ref1, ref2;
        this.file_drag_hover(e);
        files = ((ref = e.originalEvent.dataTransfer) != null ? ref.files : void 0) || ((ref1 = e.target) != null ? ref1.files : void 0) || ((ref2 = e.dataTransfer) != null ? ref2.files : void 0);
        if ((files != null ? files.length : void 0) > 0) {
          return this.upload_files(files);
        }
      };

      FileUploader.prototype.upload_files = function(files) {
        return this.get_upload_urls(files.length, (function(_this) {
          return function(error, urls) {
            if (error) {
              console.log('Error getting URLs', error);
              return;
            }
            return _this.process_files(files, urls, 0);
          };
        })(this));
      };

      FileUploader.prototype.get_upload_urls = function(n, callback) {
        if (n <= 0) {
          return;
        }
        return api_call('GET', this.upload_url, {
          count: n
        }, function(error, result) {
          if (error) {
            callback(error);
            throw error;
          }
          return callback(void 0, result);
        });
      };

      FileUploader.prototype.process_files = function(files, urls, i) {
        var ref;
        if (i >= files.length) {
          return;
        }
        return this.upload_file(files[i], urls[i].upload_url, (ref = this.upload_handler) != null ? ref.preview(files[i]) : void 0, (function(_this) {
          return function() {
            return _this.process_files(files, urls, i + 1, _this.upload_handler != null);
          };
        })(this));
      };

      FileUploader.prototype.upload_file = function(file, url, progress, callback) {
        var data, ref, ref1, xhr;
        xhr = new XMLHttpRequest();
        if (((ref = this.allowed_types) != null ? ref.length : void 0) > 0) {
          if (ref1 = file.type, indexOf.call(this.allowed_types, ref1) < 0) {
            progress(0, void 0, 'wrong_type');
            callback();
            return;
          }
        }
        if (this.max_size != null) {
          if (file.size > this.max_size) {
            progress(0, void 0, 'too_big');
            callback();
            return;
          }
        }
        xhr.upload.addEventListener('progress', function(event) {
          return progress(parseInt(event.loaded / event.total * 100.0));
        });
        xhr.onreadystatechange = (function(_this) {
          return function(event) {
            var response;
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                response = JSON.parse(xhr.responseText);
                progress(100.0, response.result);
                $('#image').val($('#image').val() + response.result.id + ';');
                return _this.active_files -= 1;
              } else {
                progress(0, void 0, 'error');
                return _this.active_files -= 1;
              }
            }
          };
        })(this);
        xhr.open('POST', url, true);
        data = new FormData();
        data.append('file', file);
        xhr.send(data);
        return callback();
      };

      return FileUploader;

    })();
  })();

}).call(this);

(function() {
  window.LOG = function() {
    return typeof console !== "undefined" && console !== null ? typeof console.log === "function" ? console.log.apply(console, arguments) : void 0 : void 0;
  };

  window.init_common = function() {
    init_loading_button();
    init_confirm_button();
    init_password_show_button();
    init_time();
    init_announcement();
    return init_row_link();
  };

  window.init_loading_button = function() {
    return $('body').on('click', '.btn-loading', function() {
      return $(this).button('loading');
    });
  };

  window.init_confirm_button = function() {
    return $('body').on('click', '.btn-confirm', function() {
      if (!confirm($(this).data('message') || 'Are you sure?')) {
        return event.preventDefault();
      }
    });
  };

  window.init_password_show_button = function() {
    return $('body').on('click', '.btn-password-show', function() {
      var $target;
      $target = $($(this).data('target'));
      $target.focus();
      if ($(this).hasClass('active')) {
        return $target.attr('type', 'password');
      } else {
        return $target.attr('type', 'text');
      }
    });
  };

  window.init_time = function() {
    var recalculate;
    if ($('time').length > 0) {
      recalculate = function() {
        $('time[datetime]').each(function() {
          var date, diff;
          date = moment.utc($(this).attr('datetime'));
          diff = moment().diff(date, 'days');
          if (diff > 25) {
            $(this).text(date.local().format('YYYY-MM-DD'));
          } else {
            $(this).text(date.fromNow());
          }
          return $(this).attr('title', date.local().format('dddd, MMMM Do YYYY, HH:mm:ss Z'));
        });
        return setTimeout(arguments.callee, 1000 * 45);
      };
      return recalculate();
    }
  };

  window.init_announcement = function() {
    $('.alert-announcement button.close').click(function() {
      return typeof sessionStorage !== "undefined" && sessionStorage !== null ? sessionStorage.setItem('closedAnnouncement', $('.alert-announcement').html()) : void 0;
    });
    if ((typeof sessionStorage !== "undefined" && sessionStorage !== null ? sessionStorage.getItem('closedAnnouncement') : void 0) !== $('.alert-announcement').html()) {
      return $('.alert-announcement').show();
    }
  };

  window.init_row_link = function() {
    $('body').on('click', '.row-link', function() {
      return window.location.href = $(this).data('href');
    });
    return $('body').on('click', '.not-link', function(e) {
      return e.stopPropagation();
    });
  };

  window.clear_notifications = function() {
    return $('#notifications').empty();
  };

  window.show_notification = function(message, category) {
    if (category == null) {
      category = 'warning';
    }
    clear_notifications();
    if (!message) {
      return;
    }
    return $('#notifications').append("<div class=\"alert alert-dismissable alert-" + category + "\">\n  <button type=\"button\" class=\"close\" data-dismiss=\"alert\" aria-hidden=\"true\">&times;</button>\n  " + message + "\n</div>");
  };

  window.size_human = function(nbytes) {
    var i, len, ref, suffix;
    ref = ['B', 'KB', 'MB', 'GB', 'TB'];
    for (i = 0, len = ref.length; i < len; i++) {
      suffix = ref[i];
      if (nbytes < 1000) {
        if (suffix === 'B') {
          return nbytes + " " + suffix;
        }
        return (parseInt(nbytes * 10) / 10) + " " + suffix;
      }
      nbytes /= 1024.0;
    }
  };

}).call(this);

(function() {
  $(function() {
    return init_common();
  });

  $(function() {
    return $('html.auth').each(function() {
      return init_auth();
    });
  });

  $(function() {
    return $('html.user-list').each(function() {
      return init_user_list();
    });
  });

  $(function() {
    return $('html.user-merge').each(function() {
      return init_user_merge();
    });
  });

  $(function() {
    return $('html.resource-list').each(function() {
      return init_resource_list();
    });
  });

  $(function() {
    return $('html.resource-view').each(function() {
      return init_resource_view();
    });
  });

  $(function() {
    return $('html.resource-upload').each(function() {
      return init_resource_upload();
    });
  });

}).call(this);

(function() {
  window.init_auth = function() {
    $('.remember').change(function() {
      var button, buttons, href, i, len, results;
      buttons = $('.btn-social').toArray().concat($('.btn-social-icon').toArray());
      results = [];
      for (i = 0, len = buttons.length; i < len; i++) {
        button = buttons[i];
        href = $(button).prop('href');
        if ($('.remember input').is(':checked')) {
          $(button).prop('href', href + "&remember=true");
          results.push($('#remember').prop('checked', true));
        } else {
          $(button).prop('href', href.replace('&remember=true', ''));
          results.push($('#remember').prop('checked', false));
        }
      }
      return results;
    });
    return $('.remember').change();
  };

}).call(this);

(function() {
  if ($(".pretty-file").length) {
    $(".pretty-file").each(function() {
      var file_input, pretty_file;
      pretty_file = $(this);
      file_input = pretty_file.find('input[type="file"]');
      file_input.hide();
      file_input.change(function() {
        var files, info, path;
        files = file_input[0].files;
        info = "";
        if (files.length > 1) {
          info = files.length + " files selected";
        } else {
          path = file_input.val().split("\\");
          info = path[path.length - 1];
        }
        return pretty_file.find(".input-group input").val(info);
      });
      return pretty_file.find(".input-group").click(function(e) {
        e.preventDefault();
        file_input.click();
        return $(this).blur();
      });
    });
  }

}).call(this);

(function() {
  var upload_handler;

  window.init_resource_list = function() {
    return init_delete_resource_button();
  };

  window.init_resource_view = function() {
    return init_delete_resource_button();
  };

  window.init_resource_upload = function() {
    if (window.File && window.FileList && window.FileReader) {
      return window.file_uploader = new FileUploader({
        upload_handler: upload_handler,
        selector: $('.file'),
        drop_area: $('.drop-area'),
        confirm_message: 'Files are still being uploaded.',
        upload_url: $('.file').data('get-upload-url'),
        allowed_types: [],
        max_size: 1024 * 1024 * 1024
      });
    }
  };

  upload_handler = {
    preview: function(file) {
      var $preview, $resource, reader;
      $resource = $("<div class=\"col-lg-2 col-md-3 col-sm-4 col-xs-6\">\n  <div class=\"thumbnail\">\n    <div class=\"preview\"></div>\n    <h5>" + file.name + "</h5>\n    <div class=\"progress\">\n      <div class=\"progress-bar\" style=\"width: 0%;\"></div>\n      <div class=\"progress-text\"></div>\n    </div>\n  </div>\n</div>");
      $preview = $('.preview', $resource);
      if (file_uploader.active_files < 16 && file.type.indexOf("image") === 0) {
        reader = new FileReader();
        reader.onload = (function(_this) {
          return function(e) {
            return $preview.css('background-image', "url(" + e.target.result + ")");
          };
        })(this);
        reader.readAsDataURL(file);
      } else {
        $preview.text(file.type || 'application/octet-stream');
      }
      $('.resource-uploads').prepend($resource);
      return (function(_this) {
        return function(progress, resource, error) {
          if (error) {
            $('.progress-bar', $resource).css('width', '100%');
            $('.progress-bar', $resource).addClass('progress-bar-danger');
            if (error === 'too_big') {
              $('.progress-text', $resource).text("Failed! Too big, max: " + (size_human(file_uploader.max_size)) + ".");
            } else if (error === 'wrong_type') {
              $('.progress-text', $resource).text("Failed! Wrong file type.");
            } else {
              $('.progress-text', $resource).text('Failed!');
            }
            return;
          }
          if (progress === 100.0 && resource) {
            $('.progress-bar', $resource).addClass('progress-bar-success');
            $('.progress-text', $resource).text("Success " + (size_human(file.size)));
            if (resource.image_url && $preview.text().length > 0) {
              $preview.css('background-image', "url(" + resource.image_url + ")");
              return $preview.text('');
            }
          } else if (progress === 100.0) {
            $('.progress-bar', $resource).css('width', '100%');
            return $('.progress-text', $resource).text("100% - Processing..");
          } else {
            $('.progress-bar', $resource).css('width', progress + "%");
            return $('.progress-text', $resource).text(progress + "% of " + (size_human(file.size)));
          }
        };
      })(this);
    }
  };

  window.init_delete_resource_button = function() {
    return $('body').on('click', '.btn-delete', function(e) {
      e.preventDefault();
      if (confirm('Press OK to delete the resource')) {
        $(this).attr('disabled', 'disabled');
        return api_call('DELETE', $(this).data('api-url'), (function(_this) {
          return function(err, result) {
            var redirect_url, target;
            if (err) {
              $(_this).removeAttr('disabled');
              LOG('Something went terribly wrong during delete!', err);
              return;
            }
            target = $(_this).data('target');
            redirect_url = $(_this).data('redirect-url');
            if (target) {
              $("" + target).remove();
            }
            if (redirect_url) {
              return window.location.href = redirect_url;
            }
          };
        })(this));
      }
    });
  };

}).call(this);

(function() {
  var init_user_delete_btn, init_user_merge_btn, init_user_selections, select_default_user, update_user_selections, user_select_row;

  window.init_user_list = function() {
    init_user_selections();
    init_user_delete_btn();
    return init_user_merge_btn();
  };

  init_user_selections = function() {
    $('input[name=user_db]').each(function() {
      return user_select_row($(this));
    });
    $('#select-all').change(function() {
      $('input[name=user_db]').prop('checked', $(this).is(':checked'));
      return $('input[name=user_db]').each(function() {
        return user_select_row($(this));
      });
    });
    return $('input[name=user_db]').change(function() {
      return user_select_row($(this));
    });
  };

  user_select_row = function($element) {
    update_user_selections();
    return $('input[name=user_db]').each(function() {
      var id;
      id = $element.val();
      return $("#" + id).toggleClass('warning', $element.is(':checked'));
    });
  };

  update_user_selections = function() {
    var selected;
    selected = $('input[name=user_db]:checked').length;
    $('#user-actions').toggleClass('hidden', selected === 0);
    $('#user-merge').toggleClass('hidden', selected < 2);
    if (selected === 0) {
      $('#select-all').prop('indeterminate', false);
      return $('#select-all').prop('checked', false);
    } else if ($('input[name=user_db]:not(:checked)').length === 0) {
      $('#select-all').prop('indeterminate', false);
      return $('#select-all').prop('checked', true);
    } else {
      return $('#select-all').prop('indeterminate', true);
    }
  };

  init_user_delete_btn = function() {
    return $('#user-delete').click(function(e) {
      var confirm_message, delete_url, error_message, success_message, user_keys;
      clear_notifications();
      e.preventDefault();
      confirm_message = ($(this).data('confirm')).replace('{users}', $('input[name=user_db]:checked').length);
      if (confirm(confirm_message)) {
        user_keys = [];
        $('input[name=user_db]:checked').each(function() {
          $(this).attr('disabled', true);
          return user_keys.push($(this).val());
        });
        delete_url = $(this).data('api-url');
        success_message = $(this).data('success');
        error_message = $(this).data('error');
        return api_call('DELETE', delete_url, {
          user_keys: user_keys.join(',')
        }, function(err, result) {
          if (err) {
            $('input[name=user_db]:disabled').removeAttr('disabled');
            show_notification(error_message.replace('{users}', user_keys.length), 'danger');
            return;
          }
          return $("#" + (result.join(', #'))).fadeOut(function() {
            $(this).remove();
            update_user_selections();
            return show_notification(success_message.replace('{users}', user_keys.length), 'success');
          });
        });
      }
    });
  };

  window.init_user_merge = function() {
    var api_url, user_keys;
    user_keys = $('#user_keys').val();
    api_url = $('.api-url').data('api-url');
    api_call('GET', api_url, {
      user_keys: user_keys
    }, function(error, result) {
      if (error) {
        LOG('Something went terribly wrong');
        return;
      }
      window.user_dbs = result;
      return $('input[name=user_db]').removeAttr('disabled');
    });
    return $('input[name=user_db]').change(function(event) {
      var user_key;
      user_key = $(event.currentTarget).val();
      return select_default_user(user_key);
    });
  };

  select_default_user = function(user_key) {
    var i, len, results, user_db;
    $('.user-row').removeClass('success').addClass('danger');
    $("#" + user_key).removeClass('danger').addClass('success');
    results = [];
    for (i = 0, len = user_dbs.length; i < len; i++) {
      user_db = user_dbs[i];
      if (user_key === user_db.key) {
        $('input[name=user_key]').val(user_db.key);
        $('input[name=username]').val(user_db.username);
        $('input[name=name]').val(user_db.name);
        $('input[name=email]').val(user_db.email);
        break;
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  init_user_merge_btn = function() {
    return $('#user-merge').click(function(e) {
      var user_keys, user_merge_url;
      e.preventDefault();
      user_keys = [];
      $('input[name=user_db]:checked').each(function() {
        return user_keys.push($(this).val());
      });
      user_merge_url = $(this).data('user-merge-url');
      return window.location.href = user_merge_url + "?user_keys=" + (user_keys.join(','));
    });
  };

}).call(this);


function followFunction(x, y) {

    api_url = '/api/v1/follow/' + y + '/';

    if(x.classList.contains("label-default")){
         if(x.classList.contains("not-logged-in")){
//            $("#loginform").css({"visibility":"visible","display":"block"});
            $(".recommender").css({"display":"none"});
            $("#loginform").fadeIn();
//            $("#restaurant").fadeOut();
         } else {

            x.classList.remove("label-default")
            x.classList.add("label-success")
            x.innerHTML='FOLLOWING';
            $.ajax({
                        url: api_url,    //Your api url
                        type: 'PUT',   //type is any HTTP method
                        data: {

                        },      //Data as js object
                        success: function () {
                        }
                    })
                    ;
         }

    } else if(x.classList.contains("label-success")){

        x.classList.remove("label-success")
        x.classList.add("label-default")
        x.innerHTML = 'FOLLOW';
        $.ajax({
                    url: api_url,
                    type: 'DELETE',
                    success: function(result) {
                        // Do something with the result
                    }
                })
                ;
    }

}

$('.close-icon').on('click',function() {
  $(this).closest('.card').css({"display":"none"});
  $(".recommender").fadeIn();
})

var keywords = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
    url: '/keywords',
    filter: function(list) {
      return $.map(list, function(cityname) {
        return { name: cityname }; });
    }
  }

});

keywords.initialize();

$('#search').typeahead(null, {
     minlength: 1,
     name: 'keywords',
     displayKey: 'name',
     valueKey: 'name',
     source: keywords.ttAdapter()
});


$('#keywords').tagsinput({
    confirmKeys: [13, 32, 44],
    typeaheadjs: [{
          minLength: 1,
          highlight: true,

    },{
        minlength: 1,
        name: 'keywords',
        displayKey: 'name',
        valueKey: 'name',
        source: keywords.ttAdapter()
    }],
    freeInput: true,

});

$( document ).ready(function() {
    localStorage.clear();
});



function starFunction(x, y) {

    api_url = '/api/v1/star/' + y + '/';

    if(x.classList.contains("fa-star-o")){
         if(x.classList.contains("not-logged-in")){
//            $("#loginform").css({"visibility":"visible","display":"block"});
            $("#restaurant").css({"display":"none"});
            $("#loginform").fadeIn();
//            $("#restaurant").fadeOut();
         } else {

            x.classList.remove("fa-star-o")
            x.classList.add("fa-star")
            $.ajax({
                        url: api_url,    //Your api url
                        type: 'PUT',   //type is any HTTP method
                        data: {

                        },      //Data as js object
                        success: function () {
                        }
                    })
                    ;
         }

    } else if(x.classList.contains("fa-star")){

        x.classList.remove("fa-star")
        x.classList.add("fa-star-o")
        $.ajax({
                    url: api_url,
                    type: 'DELETE',
                    success: function(result) {
                        // Do something with the result
                    }
                })
                ;
    }

}

$('.close-icon').on('click',function() {
  $(this).closest('.card').css({"display":"none"});
  $("#restaurant").fadeIn();
})
(function($){"use strict";var MagicSuggest=function(element,options){var ms=this;var defaults={allowFreeEntries:true,allowDuplicates:false,ajaxConfig:{},autoSelect:true,selectFirst:false,queryParam:"query",beforeSend:function(){},cls:"",data:null,dataUrlParams:{},disabled:false,disabledField:null,displayField:"name",editable:true,expanded:false,expandOnFocus:false,groupBy:null,hideTrigger:false,highlight:true,id:null,infoMsgCls:"",inputCfg:{},invalidCls:"ms-inv",matchCase:false,maxDropHeight:290,maxEntryLength:null,maxEntryRenderer:function(v){return"Please reduce your entry by "+v+" character"+(v>1?"s":"")},maxSuggestions:null,maxSelection:10,maxSelectionRenderer:function(v){return"You cannot choose more than "+v+" item"+(v>1?"s":"")},method:"POST",minChars:0,minCharsRenderer:function(v){return"Please type "+v+" more character"+(v>1?"s":"")},mode:"local",name:null,noSuggestionText:"No suggestions",placeholder:"Type or click here",renderer:null,required:false,resultAsString:false,resultAsStringDelimiter:",",resultsField:"results",selectionCls:"",selectionContainer:null,selectionPosition:"inner",selectionRenderer:null,selectionStacked:false,sortDir:"asc",sortOrder:null,strictSuggest:false,style:"",toggleOnClick:false,typeDelay:400,useTabKey:false,useCommaKey:true,useZebraStyle:false,value:null,valueField:"id",vregex:null,vtype:null};var conf=$.extend({},options);var cfg=$.extend(true,{},defaults,conf);this.addToSelection=function(items,isSilent){if(!cfg.maxSelection||_selection.length<cfg.maxSelection){if(!$.isArray(items)){items=[items]}var valuechanged=false;$.each(items,function(index,json){if(cfg.allowDuplicates||$.inArray(json[cfg.valueField],ms.getValue())===-1){_selection.push(json);valuechanged=true}});if(valuechanged===true){self._renderSelection();this.empty();if(isSilent!==true){$(this).trigger("selectionchange",[this,this.getSelection()])}}}this.input.attr("placeholder",cfg.selectionPosition==="inner"&&this.getValue().length>0?"":cfg.placeholder)};this.clear=function(isSilent){this.removeFromSelection(_selection.slice(0),isSilent)};this.collapse=function(){if(cfg.expanded===true){this.combobox.detach();cfg.expanded=false;$(this).trigger("collapse",[this])}};this.disable=function(){this.container.addClass("ms-ctn-disabled");cfg.disabled=true;ms.input.attr("disabled",true)};this.empty=function(){this.input.val("")};this.enable=function(){this.container.removeClass("ms-ctn-disabled");cfg.disabled=false;ms.input.attr("disabled",false)};this.expand=function(){if(!cfg.expanded&&(this.input.val().length>=cfg.minChars||this.combobox.children().size()>0)){this.combobox.appendTo(this.container);self._processSuggestions();cfg.expanded=true;$(this).trigger("expand",[this])}};this.isDisabled=function(){return cfg.disabled};this.isValid=function(){var valid=cfg.required===false||_selection.length>0;if(cfg.vtype||cfg.vregex){$.each(_selection,function(index,item){valid=valid&&self._validateSingleItem(item[cfg.valueField])})}return valid};this.getDataUrlParams=function(){return cfg.dataUrlParams};this.getName=function(){return cfg.name};this.getSelection=function(){return _selection};this.getRawValue=function(){return ms.input.val()};this.getValue=function(){return $.map(_selection,function(o){return o[cfg.valueField]})};this.removeFromSelection=function(items,isSilent){if(!$.isArray(items)){items=[items]}var valuechanged=false;$.each(items,function(index,json){var i=$.inArray(json[cfg.valueField],ms.getValue());if(i>-1){_selection.splice(i,1);valuechanged=true}});if(valuechanged===true){self._renderSelection();if(isSilent!==true){$(this).trigger("selectionchange",[this,this.getSelection()])}if(cfg.expandOnFocus){ms.expand()}if(cfg.expanded){self._processSuggestions()}}this.input.attr("placeholder",cfg.selectionPosition==="inner"&&this.getValue().length>0?"":cfg.placeholder)};this.getData=function(){return _cbData};this.setData=function(data){cfg.data=data;self._processSuggestions()};this.setName=function(name){cfg.name=name;if(name){cfg.name+=name.indexOf("[]")>0?"":"[]"}if(ms._valueContainer){$.each(ms._valueContainer.children(),function(i,el){el.name=cfg.name})}};this.setSelection=function(items){this.clear();this.addToSelection(items)};this.setValue=function(values){var items=[];$.each(values,function(index,value){var found=false;$.each(_cbData,function(i,item){if(item[cfg.valueField]==value){items.push(item);found=true;return false}});if(!found){if(typeof value==="object"){items.push(value)}else{var json={};json[cfg.valueField]=value;json[cfg.displayField]=value;items.push(json)}}});if(items.length>0){this.addToSelection(items)}};this.setDataUrlParams=function(params){cfg.dataUrlParams=$.extend({},params)};var _selection=[],_comboItemHeight=0,_timer,_hasFocus=false,_groups=null,_cbData=[],_ctrlDown=false,KEYCODES={BACKSPACE:8,TAB:9,ENTER:13,CTRL:17,ESC:27,SPACE:32,UPARROW:38,DOWNARROW:40,COMMA:188};var self={_displaySuggestions:function(data){ms.combobox.show();ms.combobox.empty();var resHeight=0,nbGroups=0;if(_groups===null){self._renderComboItems(data);resHeight=_comboItemHeight*data.length}else{for(var grpName in _groups){nbGroups+=1;$("<div/>",{"class":"ms-res-group",html:grpName}).appendTo(ms.combobox);self._renderComboItems(_groups[grpName].items,true)}var _groupItemHeight=ms.combobox.find(".ms-res-group").outerHeight();if(_groupItemHeight!==null){var tmpResHeight=nbGroups*_groupItemHeight;resHeight=_comboItemHeight*data.length+tmpResHeight}else{resHeight=_comboItemHeight*(data.length+nbGroups)}}if(resHeight<ms.combobox.height()||resHeight<=cfg.maxDropHeight){ms.combobox.height(resHeight)}else if(resHeight>=ms.combobox.height()&&resHeight>cfg.maxDropHeight){ms.combobox.height(cfg.maxDropHeight)}if(data.length===1&&cfg.autoSelect===true){ms.combobox.children().filter(":not(.ms-res-item-disabled):last").addClass("ms-res-item-active")}if(cfg.selectFirst===true){ms.combobox.children().filter(":not(.ms-res-item-disabled):first").addClass("ms-res-item-active")}if(data.length===0&&ms.getRawValue()!==""){var noSuggestionText=cfg.noSuggestionText.replace(/\{\{.*\}\}/,ms.input.val());self._updateHelper(noSuggestionText);ms.collapse()}if(cfg.allowFreeEntries===false){if(data.length===0){$(ms.input).addClass(cfg.invalidCls);ms.combobox.hide()}else{$(ms.input).removeClass(cfg.invalidCls)}}},_getEntriesFromStringArray:function(data){var json=[];$.each(data,function(index,s){var entry={};entry[cfg.displayField]=entry[cfg.valueField]=$.trim(s);json.push(entry)});return json},_highlightSuggestion:function(html){var q=ms.input.val();var specialCharacters=["^","$","*","+","?",".","(",")",":","!","|","{","}","[","]"];$.each(specialCharacters,function(index,value){q=q.replace(value,"\\"+value)});if(q.length===0){return html}var glob=cfg.matchCase===true?"g":"gi";return html.replace(new RegExp("("+q+")(?!([^<]+)?>)",glob),"<em>$1</em>")},_moveSelectedRow:function(dir){if(!cfg.expanded){ms.expand()}var list,start,active,scrollPos;list=ms.combobox.find(".ms-res-item:not(.ms-res-item-disabled)");if(dir==="down"){start=list.eq(0)}else{start=list.filter(":last")}active=ms.combobox.find(".ms-res-item-active:not(.ms-res-item-disabled):first");if(active.length>0){if(dir==="down"){start=active.nextAll(".ms-res-item:not(.ms-res-item-disabled)").first();if(start.length===0){start=list.eq(0)}scrollPos=ms.combobox.scrollTop();ms.combobox.scrollTop(0);if(start[0].offsetTop+start.outerHeight()>ms.combobox.height()){ms.combobox.scrollTop(scrollPos+_comboItemHeight)}}else{start=active.prevAll(".ms-res-item:not(.ms-res-item-disabled)").first();if(start.length===0){start=list.filter(":last");ms.combobox.scrollTop(_comboItemHeight*list.length)}if(start[0].offsetTop<ms.combobox.scrollTop()){ms.combobox.scrollTop(ms.combobox.scrollTop()-_comboItemHeight)}}}list.removeClass("ms-res-item-active");start.addClass("ms-res-item-active")},_processSuggestions:function(source){var json=null,data=source||cfg.data;if(data!==null){if(typeof data==="function"){data=data.call(ms,ms.getRawValue())}if(typeof data==="string"){$(ms).trigger("beforeload",[ms]);var queryParams={};queryParams[cfg.queryParam]=ms.input.val();var params=$.extend(queryParams,cfg.dataUrlParams);$.ajax($.extend({type:cfg.method,url:data,data:params,beforeSend:cfg.beforeSend,success:function(asyncData){json=typeof asyncData==="string"?JSON.parse(asyncData):asyncData;self._processSuggestions(json);$(ms).trigger("load",[ms,json]);if(self._asyncValues){ms.setValue(typeof self._asyncValues==="string"?JSON.parse(self._asyncValues):self._asyncValues);self._renderSelection();delete self._asyncValues}},error:function(){throw"Could not reach server"}},cfg.ajaxConfig));return}else{if(data.length>0&&typeof data[0]==="string"){_cbData=self._getEntriesFromStringArray(data)}else{_cbData=data[cfg.resultsField]||data}}var sortedData=cfg.mode==="remote"?_cbData:self._sortAndTrim(_cbData);self._displaySuggestions(self._group(sortedData))}},_render:function(el){ms.setName(cfg.name);ms.container=$("<div/>",{"class":"ms-ctn form-control "+(cfg.resultAsString?"ms-as-string ":"")+cfg.cls+($(el).hasClass("input-lg")?" input-lg":"")+($(el).hasClass("input-sm")?" input-sm":"")+(cfg.disabled===true?" ms-ctn-disabled":"")+(cfg.editable===true?"":" ms-ctn-readonly")+(cfg.hideTrigger===false?"":" ms-no-trigger"),style:cfg.style,id:cfg.id});ms.container.focus($.proxy(handlers._onFocus,this));ms.container.blur($.proxy(handlers._onBlur,this));ms.container.keydown($.proxy(handlers._onKeyDown,this));ms.container.keyup($.proxy(handlers._onKeyUp,this));ms.input=$("<input/>",$.extend({type:"text","class":cfg.editable===true?"":" ms-input-readonly",readonly:!cfg.editable,placeholder:cfg.placeholder,disabled:cfg.disabled},cfg.inputCfg));ms.input.focus($.proxy(handlers._onInputFocus,this));ms.input.click($.proxy(handlers._onInputClick,this));ms.combobox=$("<div/>",{"class":"ms-res-ctn dropdown-menu"}).height(cfg.maxDropHeight);ms.combobox.on("click","div.ms-res-item",$.proxy(handlers._onComboItemSelected,this));ms.combobox.on("mouseover","div.ms-res-item",$.proxy(handlers._onComboItemMouseOver,this));if(cfg.selectionContainer){ms.selectionContainer=cfg.selectionContainer;$(ms.selectionContainer).addClass("ms-sel-ctn")}else{ms.selectionContainer=$("<div/>",{"class":"ms-sel-ctn"})}ms.selectionContainer.click($.proxy(handlers._onFocus,this));if(cfg.selectionPosition==="inner"&&!cfg.selectionContainer){ms.selectionContainer.append(ms.input)}else{ms.container.append(ms.input)}ms.helper=$("<span/>",{"class":"ms-helper "+cfg.infoMsgCls});self._updateHelper();ms.container.append(ms.helper);$(el).replaceWith(ms.container);if(!cfg.selectionContainer){switch(cfg.selectionPosition){case"bottom":ms.selectionContainer.insertAfter(ms.container);if(cfg.selectionStacked===true){ms.selectionContainer.width(ms.container.width());ms.selectionContainer.addClass("ms-stacked")}break;case"right":ms.selectionContainer.insertAfter(ms.container);ms.container.css("float","left");break;default:ms.container.append(ms.selectionContainer);break}}if(cfg.hideTrigger===false){ms.trigger=$("<div/>",{"class":"ms-trigger",html:'<div class="ms-trigger-ico"></div>'});ms.trigger.click($.proxy(handlers._onTriggerClick,this));ms.container.append(ms.trigger)}$(window).resize($.proxy(handlers._onWindowResized,this));if(cfg.value!==null||cfg.data!==null){if(typeof cfg.data==="string"){self._asyncValues=cfg.value;self._processSuggestions()}else{self._processSuggestions();if(cfg.value!==null){ms.setValue(cfg.value);self._renderSelection()}}}$("body").click(function(e){if(ms.container.hasClass("ms-ctn-focus")&&ms.container.has(e.target).length===0&&e.target.className.indexOf("ms-res-item")<0&&e.target.className.indexOf("ms-close-btn")<0&&ms.container[0]!==e.target){handlers._onBlur()}});if(cfg.expanded===true){cfg.expanded=false;ms.expand()}},_renderComboItems:function(items,isGrouped){var ref=this,html="";$.each(items,function(index,value){var displayed=cfg.renderer!==null?cfg.renderer.call(ref,value):value[cfg.displayField];var disabled=cfg.disabledField!==null&&value[cfg.disabledField]===true;var resultItemEl=$("<div/>",{"class":"ms-res-item "+(isGrouped?"ms-res-item-grouped ":"")+(disabled?"ms-res-item-disabled ":"")+(index%2===1&&cfg.useZebraStyle===true?"ms-res-odd":""),html:cfg.highlight===true?self._highlightSuggestion(displayed):displayed,"data-json":JSON.stringify(value)});html+=$("<div/>").append(resultItemEl).html()});ms.combobox.append(html);_comboItemHeight=ms.combobox.find(".ms-res-item:first").outerHeight()},_renderSelection:function(){var ref=this,w=0,inputOffset=0,items=[],asText=cfg.resultAsString===true&&!_hasFocus;ms.selectionContainer.find(".ms-sel-item").remove();if(ms._valueContainer!==undefined){ms._valueContainer.remove()}$.each(_selection,function(index,value){var selectedItemEl,delItemEl,selectedItemHtml=cfg.selectionRenderer!==null?cfg.selectionRenderer.call(ref,value):value[cfg.displayField];var validCls=self._validateSingleItem(value[cfg.displayField])?"":" ms-sel-invalid";if(asText===true){selectedItemEl=$("<div/>",{"class":"ms-sel-item ms-sel-text "+cfg.selectionCls+validCls,html:selectedItemHtml+(index===_selection.length-1?"":cfg.resultAsStringDelimiter)}).data("json",value)}else{selectedItemEl=$("<div/>",{"class":"ms-sel-item "+cfg.selectionCls+validCls,html:selectedItemHtml}).data("json",value);if(cfg.disabled===false){delItemEl=$("<span/>",{"class":"ms-close-btn"}).data("json",value).appendTo(selectedItemEl);delItemEl.click($.proxy(handlers._onTagTriggerClick,ref))}}items.push(selectedItemEl)});ms.selectionContainer.prepend(items);ms._valueContainer=$("<div/>",{style:"display: none;"});$.each(ms.getValue(),function(i,val){var el=$("<input/>",{type:"hidden",name:cfg.name,value:val});el.appendTo(ms._valueContainer)});ms._valueContainer.appendTo(ms.selectionContainer);if(cfg.selectionPosition==="inner"&&!cfg.selectionContainer){ms.input.width(0);inputOffset=ms.input.offset().left-ms.selectionContainer.offset().left;w=ms.container.width()-inputOffset-42;ms.input.width(w)}if(_selection.length===cfg.maxSelection){self._updateHelper(cfg.maxSelectionRenderer.call(this,_selection.length))}else{ms.helper.hide()}},_selectItem:function(item){if(cfg.maxSelection===1){_selection=[]}ms.addToSelection(item.data("json"));item.removeClass("ms-res-item-active");if(cfg.expandOnFocus===false||_selection.length===cfg.maxSelection){ms.collapse()}if(!_hasFocus){ms.input.focus()}else if(_hasFocus&&(cfg.expandOnFocus||_ctrlDown)){self._processSuggestions();if(_ctrlDown){ms.expand()}}},_sortAndTrim:function(data){var q=ms.getRawValue(),filtered=[],newSuggestions=[],selectedValues=ms.getValue();if(q.length>0){$.each(data,function(index,obj){var name=obj[cfg.displayField];if(cfg.matchCase===true&&name.indexOf(q)>-1||cfg.matchCase===false&&name.toLowerCase().indexOf(q.toLowerCase())>-1){if(cfg.strictSuggest===false||name.toLowerCase().indexOf(q.toLowerCase())===0){filtered.push(obj)}}})}else{filtered=data}$.each(filtered,function(index,obj){if(cfg.allowDuplicates||$.inArray(obj[cfg.valueField],selectedValues)===-1){newSuggestions.push(obj)}});if(cfg.sortOrder!==null){newSuggestions.sort(function(a,b){if(a[cfg.sortOrder]<b[cfg.sortOrder]){return cfg.sortDir==="asc"?-1:1}if(a[cfg.sortOrder]>b[cfg.sortOrder]){return cfg.sortDir==="asc"?1:-1}return 0})}if(cfg.maxSuggestions&&cfg.maxSuggestions>0){newSuggestions=newSuggestions.slice(0,cfg.maxSuggestions)}return newSuggestions},_group:function(data){if(cfg.groupBy!==null){_groups={};$.each(data,function(index,value){var props=cfg.groupBy.indexOf(".")>-1?cfg.groupBy.split("."):cfg.groupBy;var prop=value[cfg.groupBy];if(typeof props!="string"){prop=value;while(props.length>0){prop=prop[props.shift()]}}if(_groups[prop]===undefined){_groups[prop]={title:prop,items:[value]}}else{_groups[prop].items.push(value)}})}return data},_updateHelper:function(html){ms.helper.html(html);if(!ms.helper.is(":visible")){ms.helper.fadeIn()}},_validateSingleItem:function(value){if(cfg.vregex!==null&&cfg.vregex instanceof RegExp){return cfg.vregex.test(value)}else if(cfg.vtype!==null){switch(cfg.vtype){case"alpha":return/^[a-zA-Z_]+$/.test(value);case"alphanum":return/^[a-zA-Z0-9_]+$/.test(value);case"email":return/^(\w+)([\-+.][\w]+)*@(\w[\-\w]*\.){1,5}([A-Za-z]){2,6}$/.test(value);case"url":return/(((^https?)|(^ftp)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i.test(value);case"ipaddress":return/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)}}return true}};var handlers={_onBlur:function(){ms.container.removeClass("ms-ctn-focus");ms.collapse();_hasFocus=false;if(ms.getRawValue()!==""&&cfg.allowFreeEntries===true){var obj={};obj[cfg.displayField]=obj[cfg.valueField]=ms.getRawValue().trim();ms.addToSelection(obj)}self._renderSelection();if(ms.isValid()===false){ms.container.addClass(cfg.invalidCls)}else if(ms.input.val()!==""&&cfg.allowFreeEntries===false){ms.empty();self._updateHelper("")}$(ms).trigger("blur",[ms])},_onComboItemMouseOver:function(e){var target=$(e.currentTarget);if(!target.hasClass("ms-res-item-disabled")){ms.combobox.children().removeClass("ms-res-item-active");target.addClass("ms-res-item-active")}},_onComboItemSelected:function(e){var target=$(e.currentTarget);if(!target.hasClass("ms-res-item-disabled")){self._selectItem($(e.currentTarget))}},_onFocus:function(){ms.input.focus()},_onInputClick:function(){if(ms.isDisabled()===false&&_hasFocus){if(cfg.toggleOnClick===true){if(cfg.expanded){ms.collapse()}else{ms.expand()}}}},_onInputFocus:function(){if(ms.isDisabled()===false&&!_hasFocus){_hasFocus=true;ms.container.addClass("ms-ctn-focus");ms.container.removeClass(cfg.invalidCls);var curLength=ms.getRawValue().length;if(cfg.expandOnFocus===true){ms.expand()}if(_selection.length===cfg.maxSelection){self._updateHelper(cfg.maxSelectionRenderer.call(this,_selection.length))}else if(curLength<cfg.minChars){self._updateHelper(cfg.minCharsRenderer.call(this,cfg.minChars-curLength))}self._renderSelection();$(ms).trigger("focus",[ms])}},_onKeyDown:function(e){var active=ms.combobox.find(".ms-res-item-active:not(.ms-res-item-disabled):first"),freeInput=ms.input.val();$(ms).trigger("keydown",[ms,e]);if(e.keyCode===KEYCODES.TAB&&(cfg.useTabKey===false||cfg.useTabKey===true&&active.length===0&&ms.input.val().length===0)){handlers._onBlur();return}switch(e.keyCode){case KEYCODES.BACKSPACE:if(freeInput.length===0&&ms.getSelection().length>0&&cfg.selectionPosition==="inner"){_selection.pop();self._renderSelection();$(ms).trigger("selectionchange",[ms,ms.getSelection()]);ms.input.attr("placeholder",cfg.selectionPosition==="inner"&&ms.getValue().length>0?"":cfg.placeholder);ms.input.focus();e.preventDefault()}break;case KEYCODES.TAB:case KEYCODES.ESC:e.preventDefault();break;case KEYCODES.ENTER:if(freeInput!==""||cfg.expanded){e.preventDefault()}break;case KEYCODES.COMMA:if(cfg.useCommaKey===true){e.preventDefault()}break;case KEYCODES.CTRL:_ctrlDown=true;break;case KEYCODES.DOWNARROW:e.preventDefault();self._moveSelectedRow("down");break;case KEYCODES.UPARROW:e.preventDefault();self._moveSelectedRow("up");break;default:if(_selection.length===cfg.maxSelection){e.preventDefault()}break}},_onKeyUp:function(e){var freeInput=ms.getRawValue(),inputValid=$.trim(ms.input.val()).length>0&&(!cfg.maxEntryLength||$.trim(ms.input.val()).length<=cfg.maxEntryLength),selected,obj={};$(ms).trigger("keyup",[ms,e]);clearTimeout(_timer);if(e.keyCode===KEYCODES.ESC&&cfg.expanded){ms.combobox.hide()}if(e.keyCode===KEYCODES.TAB&&cfg.useTabKey===false||e.keyCode>KEYCODES.ENTER&&e.keyCode<KEYCODES.SPACE){if(e.keyCode===KEYCODES.CTRL){_ctrlDown=false}return}switch(e.keyCode){case KEYCODES.UPARROW:case KEYCODES.DOWNARROW:e.preventDefault();break;case KEYCODES.ENTER:case KEYCODES.TAB:case KEYCODES.COMMA:if(e.keyCode!==KEYCODES.COMMA||cfg.useCommaKey===true){e.preventDefault();if(cfg.expanded===true){selected=ms.combobox.find(".ms-res-item-active:not(.ms-res-item-disabled):first");if(selected.length>0){self._selectItem(selected);return}}if(inputValid===true&&cfg.allowFreeEntries===true){obj[cfg.displayField]=obj[cfg.valueField]=freeInput.trim();ms.addToSelection(obj);ms.collapse();ms.input.focus()}break}default:if(_selection.length===cfg.maxSelection){self._updateHelper(cfg.maxSelectionRenderer.call(this,_selection.length))}else{if(freeInput.length<cfg.minChars){self._updateHelper(cfg.minCharsRenderer.call(this,cfg.minChars-freeInput.length));if(cfg.expanded===true){ms.collapse()}}else if(cfg.maxEntryLength&&freeInput.length>cfg.maxEntryLength){self._updateHelper(cfg.maxEntryRenderer.call(this,freeInput.length-cfg.maxEntryLength));if(cfg.expanded===true){ms.collapse()}}else{ms.helper.hide();if(cfg.minChars<=freeInput.length){_timer=setTimeout(function(){if(cfg.expanded===true){self._processSuggestions()}else{ms.expand()}},cfg.typeDelay)}}}break}},_onTagTriggerClick:function(e){ms.removeFromSelection($(e.currentTarget).data("json"))},_onTriggerClick:function(){if(ms.isDisabled()===false&&!(cfg.expandOnFocus===true&&_selection.length===cfg.maxSelection)){$(ms).trigger("triggerclick",[ms]);if(cfg.expanded===true){ms.collapse()}else{var curLength=ms.getRawValue().length;if(curLength>=cfg.minChars){ms.input.focus();ms.expand()}else{self._updateHelper(cfg.minCharsRenderer.call(this,cfg.minChars-curLength))}}}},_onWindowResized:function(){self._renderSelection()}};if(element!==null){self._render(element)}};$.fn.magicSuggest=function(options){var obj=$(this);if(obj.size()===1&&obj.data("magicSuggest")){return obj.data("magicSuggest")}obj.each(function(i){var cntr=$(this);if(cntr.data("magicSuggest")){return}if(this.nodeName.toLowerCase()==="select"){options.data=[];options.value=[];$.each(this.children,function(index,child){if(child.nodeName&&child.nodeName.toLowerCase()==="option"){options.data.push({id:child.value,name:child.text});if($(child).attr("selected")){options.value.push(child.value)}}})}var def={};$.each(this.attributes,function(i,att){def[att.name]=att.name==="value"&&att.value!==""?JSON.parse(att.value):att.value});var field=new MagicSuggest(this,$.extend([],$.fn.magicSuggest.defaults,options,def));cntr.data("magicSuggest",field);field.container.data("magicSuggest",field)});if(obj.size()===1){return obj.data("magicSuggest")}return obj};$.fn.magicSuggest.defaults={}})(jQuery);
/**
 * Multiple Selection Component for Bootstrap
 * Check nicolasbize.github.io/magicsuggest/ for latest updates.
 *
 * Author:       Nicolas Bize
 * Created:      Feb 8th 2013
 * Last Updated: Oct 16th 2014
 * Version:      2.1.4
 * Licence:      MagicSuggest is licenced under MIT licence (http://opensource.org/licenses/MIT)
 */
(function($)
{
    "use strict";
    var MagicSuggest = function(element, options)
    {
        var ms = this;

        /**
         * Initializes the MagicSuggest component
         */
        var defaults = {
            /**********  CONFIGURATION PROPERTIES ************/
            /**
             * Restricts or allows the user to validate typed entries.
             * Defaults to true.
             */
            allowFreeEntries: true,

            /**
             * Restricts or allows the user to add the same entry more than once
             * Defaults to false.
             */
            allowDuplicates: false,

            /**
             * Additional config object passed to each $.ajax call
             */
            ajaxConfig: {},

            /**
             * If a single suggestion comes out, it is preselected.
             */
            autoSelect: true,

            /**
             * Auto select the first matching item with multiple items shown
             */
            selectFirst: false,

            /**
             * Allow customization of query parameter
             */
            queryParam: 'query',

            /**
             * A function triggered just before the ajax request is sent, similar to jQuery
             */
            beforeSend: function(){ },

            /**
             * A custom CSS class to apply to the field's underlying element.
             */
            cls: '',

            /**
             * JSON Data source used to populate the combo box. 3 options are available here:
             * No Data Source (default)
             *    When left null, the combo box will not suggest anything. It can still enable the user to enter
             *    multiple entries if allowFreeEntries is * set to true (default).
             * Static Source
             *    You can pass an array of JSON objects, an array of strings or even a single CSV string as the
             *    data source.For ex. data: [* {id:0,name:"Paris"}, {id: 1, name: "New York"}]
             *    You can also pass any json object with the results property containing the json array.
             * Url
             *     You can pass the url from which the component will fetch its JSON data.Data will be fetched
             *     using a POST ajax request that will * include the entered text as 'query' parameter. The results
             *     fetched from the server can be:
             *     - an array of JSON objects (ex: [{id:...,name:...},{...}])
             *     - a string containing an array of JSON objects ready to be parsed (ex: "[{id:...,name:...},{...}]")
             *     - a JSON object whose data will be contained in the results property
             *      (ex: {results: [{id:...,name:...},{...}]
             * Function
             *     You can pass a function which returns an array of JSON objects  (ex: [{id:...,name:...},{...}])
             *     The function can return the JSON data or it can use the first argument as function to handle the data.
             *     Only one (callback function or return value) is needed for the function to succeed.
             *     See the following example:
             *     function (response) { var myjson = [{name: 'test', id: 1}]; response(myjson); return myjson; }
             */
            data: null,

            /**
             * Additional parameters to the ajax call
             */
            dataUrlParams: {},

            /**
             * Start the component in a disabled state.
             */
            disabled: false,

            /**
             * Name of JSON object property that defines the disabled behaviour
             */
            disabledField: null,

            /**
             * Name of JSON object property displayed in the combo list
             */
            displayField: 'name',

            /**
             * Set to false if you only want mouse interaction. In that case the combo will
             * automatically expand on focus.
             */
            editable: true,

            /**
             * Set starting state for combo.
             */
            expanded: false,

            /**
             * Automatically expands combo on focus.
             */
            expandOnFocus: false,

            /**
             * JSON property by which the list should be grouped
             */
            groupBy: null,

            /**
             * Set to true to hide the trigger on the right
             */
            hideTrigger: false,

            /**
             * Set to true to highlight search input within displayed suggestions
             */
            highlight: true,

            /**
             * A custom ID for this component
             */
            id: null,

            /**
             * A class that is added to the info message appearing on the top-right part of the component
             */
            infoMsgCls: '',

            /**
             * Additional parameters passed out to the INPUT tag. Enables usage of AngularJS's custom tags for ex.
             */
            inputCfg: {},

            /**
             * The class that is applied to show that the field is invalid
             */
            invalidCls: 'ms-inv',

            /**
             * Set to true to filter data results according to case. Useless if the data is fetched remotely
             */
            matchCase: false,

            /**
             * Once expanded, the combo's height will take as much room as the # of available results.
             *    In case there are too many results displayed, this will fix the drop down height.
             */
            maxDropHeight: 290,

            /**
             * Defines how long the user free entry can be. Set to null for no limit.
             */
            maxEntryLength: null,

            /**
             * A function that defines the helper text when the max entry length has been surpassed.
             */
            maxEntryRenderer: function(v) {
                return 'Please reduce your entry by ' + v + ' character' + (v > 1 ? 's':'');
            },

            /**
             * The maximum number of results displayed in the combo drop down at once.
             */
            maxSuggestions: null,

            /**
             * The maximum number of items the user can select if multiple selection is allowed.
             *    Set to null to remove the limit.
             */
            maxSelection: 10,

            /**
             * A function that defines the helper text when the max selection amount has been reached. The function has a single
             *    parameter which is the number of selected elements.
             */
            maxSelectionRenderer: function(v) {
                return 'You cannot choose more than ' + v + ' item' + (v > 1 ? 's':'');
            },

            /**
             * The method used by the ajax request.
             */
            method: 'POST',

            /**
             * The minimum number of characters the user must type before the combo expands and offers suggestions.
             */
            minChars: 0,

            /**
             * A function that defines the helper text when not enough letters are set. The function has a single
             *    parameter which is the difference between the required amount of letters and the current one.
             */
            minCharsRenderer: function(v) {
                return 'Please type ' + v + ' more character' + (v > 1 ? 's':'');
            },

            /**
             * Whether or not sorting / filtering should be done remotely or locally.
             * Use either 'local' or 'remote'
             */
            mode: 'local',

            /**
             * The name used as a form element.
             */
            name: null,

            /**
             * The text displayed when there are no suggestions.
             */
            noSuggestionText: 'No suggestions',

            /**
             * The default placeholder text when nothing has been entered
             */
            placeholder: 'Type or click here',

            /**
             * A function used to define how the items will be presented in the combo
             */
            renderer: null,

            /**
             * Whether or not this field should be required
             */
            required: false,

            /**
             * Set to true to render selection as a delimited string
             */
            resultAsString: false,

            /**
             * Text delimiter to use in a delimited string.
             */
            resultAsStringDelimiter: ',',

            /**
             * Name of JSON object property that represents the list of suggested objects
             */
            resultsField: 'results',

            /**
             * A custom CSS class to add to a selected item
             */
            selectionCls: '',

            /**
             * An optional element replacement in which the selection is rendered
             */
            selectionContainer: null,

            /**
             * Where the selected items will be displayed. Only 'right', 'bottom' and 'inner' are valid values
             */
            selectionPosition: 'inner',

            /**
             * A function used to define how the items will be presented in the tag list
             */
            selectionRenderer: null,

            /**
             * Set to true to stack the selectioned items when positioned on the bottom
             *    Requires the selectionPosition to be set to 'bottom'
             */
            selectionStacked: false,

            /**
             * Direction used for sorting. Only 'asc' and 'desc' are valid values
             */
            sortDir: 'asc',

            /**
             * name of JSON object property for local result sorting.
             *    Leave null if you do not wish the results to be ordered or if they are already ordered remotely.
             */
            sortOrder: null,

            /**
             * If set to true, suggestions will have to start by user input (and not simply contain it as a substring)
             */
            strictSuggest: false,

            /**
             * Custom style added to the component container.
             */
            style: '',

            /**
             * If set to true, the combo will expand / collapse when clicked upon
             */
            toggleOnClick: false,


            /**
             * Amount (in ms) between keyboard registers.
             */
            typeDelay: 400,

            /**
             * If set to true, tab won't blur the component but will be registered as the ENTER key
             */
            useTabKey: false,

            /**
             * If set to true, using comma will validate the user's choice
             */
            useCommaKey: true,


            /**
             * Determines whether or not the results will be displayed with a zebra table style
             */
            useZebraStyle: false,

            /**
             * initial value for the field
             */
            value: null,

            /**
             * name of JSON object property that represents its underlying value
             */
            valueField: 'id',

            /**
             * regular expression to validate the values against
             */
            vregex: null,

            /**
             * type to validate against
             */
            vtype: null
        };

        var conf = $.extend({},options);
        var cfg = $.extend(true, {}, defaults, conf);

        /**********  PUBLIC METHODS ************/
        /**
         * Add one or multiple json items to the current selection
         * @param items - json object or array of json objects
         * @param isSilent - (optional) set to true to suppress 'selectionchange' event from being triggered
         */
        this.addToSelection = function(items, isSilent)
        {
            if (!cfg.maxSelection || _selection.length < cfg.maxSelection) {
                if (!$.isArray(items)) {
                    items = [items];
                }
                var valuechanged = false;
                $.each(items, function(index, json) {
                    if (cfg.allowDuplicates || $.inArray(json[cfg.valueField], ms.getValue()) === -1) {
                        _selection.push(json);
                        valuechanged = true;
                    }
                });
                if(valuechanged === true) {
                    self._renderSelection();
                    this.empty();
                    if (isSilent !== true) {
                        $(this).trigger('selectionchange', [this, this.getSelection()]);
                    }
                }
            }
            this.input.attr('placeholder', (cfg.selectionPosition === 'inner' && this.getValue().length > 0) ? '' : cfg.placeholder);
        };

        /**
         * Clears the current selection
         * @param isSilent - (optional) set to true to suppress 'selectionchange' event from being triggered
         */
        this.clear = function(isSilent)
        {
            this.removeFromSelection(_selection.slice(0), isSilent); // clone array to avoid concurrency issues
        };

        /**
         * Collapse the drop down part of the combo
         */
        this.collapse = function()
        {
            if (cfg.expanded === true) {
                this.combobox.detach();
                cfg.expanded = false;
                $(this).trigger('collapse', [this]);
            }
        };

        /**
         * Set the component in a disabled state.
         */
        this.disable = function()
        {
            this.container.addClass('ms-ctn-disabled');
            cfg.disabled = true;
            ms.input.attr('disabled', true);
        };

        /**
         * Empties out the combo user text
         */
        this.empty = function(){
            this.input.val('');
        };

        /**
         * Set the component in a enable state.
         */
        this.enable = function()
        {
            this.container.removeClass('ms-ctn-disabled');
            cfg.disabled = false;
            ms.input.attr('disabled', false);
        };

        /**
         * Expand the drop drown part of the combo.
         */
        this.expand = function()
        {
            if (!cfg.expanded && (this.input.val().length >= cfg.minChars || this.combobox.children().size() > 0)) {
                this.combobox.appendTo(this.container);
                self._processSuggestions();
                cfg.expanded = true;
                $(this).trigger('expand', [this]);
            }
        };

        /**
         * Retrieve component enabled status
         */
        this.isDisabled = function()
        {
            return cfg.disabled;
        };

        /**
         * Checks whether the field is valid or not
         * @return {boolean}
         */
        this.isValid = function()
        {
            var valid = cfg.required === false || _selection.length > 0;
            if(cfg.vtype || cfg.vregex){
                $.each(_selection, function(index, item){
                    valid = valid && self._validateSingleItem(item[cfg.valueField]);
                });
            }
            return valid;
        };

        /**
         * Gets the data params for current ajax request
         */
        this.getDataUrlParams = function()
        {
            return cfg.dataUrlParams;
        };

        /**
         * Gets the name given to the form input
         */
        this.getName = function()
        {
            return cfg.name;
        };

        /**
         * Retrieve an array of selected json objects
         * @return {Array}
         */
        this.getSelection = function()
        {
            return _selection;
        };

        /**
         * Retrieve the current text entered by the user
         */
        this.getRawValue = function(){
            return ms.input.val();
        };

        /**
         * Retrieve an array of selected values
         */
        this.getValue = function()
        {
            return $.map(_selection, function(o) {
                return o[cfg.valueField];
            });
        };

        /**
         * Remove one or multiples json items from the current selection
         * @param items - json object or array of json objects
         * @param isSilent - (optional) set to true to suppress 'selectionchange' event from being triggered
         */
        this.removeFromSelection = function(items, isSilent)
        {
            if (!$.isArray(items)) {
                items = [items];
            }
            var valuechanged = false;
            $.each(items, function(index, json) {
                var i = $.inArray(json[cfg.valueField], ms.getValue());
                if (i > -1) {
                    _selection.splice(i, 1);
                    valuechanged = true;
                }
            });
            if (valuechanged === true) {
                self._renderSelection();
                if(isSilent !== true){
                    $(this).trigger('selectionchange', [this, this.getSelection()]);
                }
                if(cfg.expandOnFocus){
                    ms.expand();
                }
                if(cfg.expanded) {
                    self._processSuggestions();
                }
            }
            this.input.attr('placeholder', (cfg.selectionPosition === 'inner' && this.getValue().length > 0) ? '' : cfg.placeholder);
        };

        /**
         * Get current data
         */
        this.getData = function(){
            return _cbData;
        };

        /**
         * Set up some combo data after it has been rendered
         * @param data
         */
        this.setData = function(data){
            cfg.data = data;
            self._processSuggestions();
        };

        /**
         * Sets the name for the input field so it can be fetched in the form
         * @param name
         */
        this.setName = function(name){
            cfg.name = name;
            if(name){
                cfg.name += name.indexOf('[]') > 0 ? '' : '[]';
            }
            if(ms._valueContainer){
                $.each(ms._valueContainer.children(), function(i, el){
                    el.name = cfg.name;
                });
            }
        };

        /**
         * Sets the current selection with the JSON items provided
         * @param items
         */
        this.setSelection = function(items){
            this.clear();
            this.addToSelection(items);
        };

        /**
         * Sets a value for the combo box. Value must be an array of values with data type matching valueField one.
         * @param data
         */
        this.setValue = function(values)
        {
            var items = [];

            $.each(values, function(index, value) {
                // first try to see if we have the full objects from our data set
                var found = false;
                $.each(_cbData, function(i,item){
                    if(item[cfg.valueField] == value){
                        items.push(item);
                        found = true;
                        return false;
                    }
                });
                if(!found){
                    if(typeof(value) === 'object'){
                        items.push(value);
                    } else {
                        var json = {};
                        json[cfg.valueField] = value;
                        json[cfg.displayField] = value;
                        items.push(json);
                    }
                }
            });
            if(items.length > 0) {
                this.addToSelection(items);
            }
        };

        /**
         * Sets data params for subsequent ajax requests
         * @param params
         */
        this.setDataUrlParams = function(params)
        {
            cfg.dataUrlParams = $.extend({},params);
        };

        /**********  PRIVATE ************/
        var _selection = [],      // selected objects
            _comboItemHeight = 0, // height for each combo item.
            _timer,
            _hasFocus = false,
            _groups = null,
            _cbData = [],
            _ctrlDown = false,
            KEYCODES = {
                BACKSPACE: 8,
                TAB: 9,
                ENTER: 13,
                CTRL: 17,
                ESC: 27,
                SPACE: 32,
                UPARROW: 38,
                DOWNARROW: 40,
                COMMA: 188
            };

        var self = {

            /**
             * Empties the result container and refills it with the array of json results in input
             * @private
             */
            _displaySuggestions: function(data) {
                ms.combobox.show();
                ms.combobox.empty();

                var resHeight = 0, // total height taken by displayed results.
                    nbGroups = 0;

                if(_groups === null) {
                    self._renderComboItems(data);
                    resHeight = _comboItemHeight * data.length;
                }
                else {
                    for(var grpName in _groups) {
                        nbGroups += 1;
                        $('<div/>', {
                            'class': 'ms-res-group',
                            html: grpName
                        }).appendTo(ms.combobox);
                        self._renderComboItems(_groups[grpName].items, true);
                    }
                    var _groupItemHeight = ms.combobox.find('.ms-res-group').outerHeight();
                    if(_groupItemHeight !== null) {
                      var tmpResHeight = nbGroups * _groupItemHeight;
                      resHeight = (_comboItemHeight * data.length) + tmpResHeight;
                    } else {
                      resHeight = _comboItemHeight * (data.length + nbGroups);
                    }
                }

                if(resHeight < ms.combobox.height() || resHeight <= cfg.maxDropHeight) {
                    ms.combobox.height(resHeight);
                }
                else if(resHeight >= ms.combobox.height() && resHeight > cfg.maxDropHeight) {
                    ms.combobox.height(cfg.maxDropHeight);
                }

                if(data.length === 1 && cfg.autoSelect === true) {
                    ms.combobox.children().filter(':not(.ms-res-item-disabled):last').addClass('ms-res-item-active');
                }

                if (cfg.selectFirst === true) {
                    ms.combobox.children().filter(':not(.ms-res-item-disabled):first').addClass('ms-res-item-active');
                }

                if(data.length === 0 && ms.getRawValue() !== "") {
                    var noSuggestionText = cfg.noSuggestionText.replace(/\{\{.*\}\}/, ms.input.val());
                    self._updateHelper(noSuggestionText);
                    ms.collapse();
                }

                // When free entry is off, add invalid class to input if no data matches
                if(cfg.allowFreeEntries === false) {
                  if(data.length === 0) {
                      $(ms.input).addClass(cfg.invalidCls);
                      ms.combobox.hide();
                  } else {
                    $(ms.input).removeClass(cfg.invalidCls);
                  }
                }
            },

            /**
             * Returns an array of json objects from an array of strings.
             * @private
             */
            _getEntriesFromStringArray: function(data) {
                var json = [];
                $.each(data, function(index, s) {
                    var entry = {};
                    entry[cfg.displayField] = entry[cfg.valueField] = $.trim(s);
                    json.push(entry);
                });
                return json;
            },

            /**
             * Replaces html with highlighted html according to case
             * @param html
             * @private
             */
            _highlightSuggestion: function(html) {
                var q = ms.input.val();

                //escape special regex characters
                var specialCharacters = ['^', '$', '*', '+', '?', '.', '(', ')', ':', '!', '|', '{', '}', '[', ']'];

                $.each(specialCharacters, function (index, value) {
                    q = q.replace(value, "\\" + value);
                })

                if(q.length === 0) {
                    return html; // nothing entered as input
                }

                var glob = cfg.matchCase === true ? 'g' : 'gi';
                return html.replace(new RegExp('(' + q + ')(?!([^<]+)?>)', glob), '<em>$1</em>');
            },

            /**
             * Moves the selected cursor amongst the list item
             * @param dir - 'up' or 'down'
             * @private
             */
            _moveSelectedRow: function(dir) {
                if(!cfg.expanded) {
                    ms.expand();
                }
                var list, start, active, scrollPos;
                list = ms.combobox.find(".ms-res-item:not(.ms-res-item-disabled)");
                if(dir === 'down') {
                    start = list.eq(0);
                }
                else {
                    start = list.filter(':last');
                }
                active = ms.combobox.find('.ms-res-item-active:not(.ms-res-item-disabled):first');
                if(active.length > 0) {
                    if(dir === 'down') {
                        start = active.nextAll('.ms-res-item:not(.ms-res-item-disabled)').first();
                        if(start.length === 0) {
                            start = list.eq(0);
                        }
                        scrollPos = ms.combobox.scrollTop();
                        ms.combobox.scrollTop(0);
                        if(start[0].offsetTop + start.outerHeight() > ms.combobox.height()) {
                            ms.combobox.scrollTop(scrollPos + _comboItemHeight);
                        }
                    }
                    else {
                        start = active.prevAll('.ms-res-item:not(.ms-res-item-disabled)').first();
                        if(start.length === 0) {
                            start = list.filter(':last');
                            ms.combobox.scrollTop(_comboItemHeight * list.length);
                        }
                        if(start[0].offsetTop < ms.combobox.scrollTop()) {
                            ms.combobox.scrollTop(ms.combobox.scrollTop() - _comboItemHeight);
                        }
                    }
                }
                list.removeClass("ms-res-item-active");
                start.addClass("ms-res-item-active");
            },

            /**
             * According to given data and query, sort and add suggestions in their container
             * @private
             */
            _processSuggestions: function(source) {
                var json = null, data = source || cfg.data;
                if(data !== null) {
                    if(typeof(data) === 'function'){
                        data = data.call(ms, ms.getRawValue());
                    }
                    if(typeof(data) === 'string') { // get results from ajax
                        $(ms).trigger('beforeload', [ms]);
                        var queryParams = {}
                        queryParams[cfg.queryParam] = ms.input.val();
                        var params = $.extend(queryParams, cfg.dataUrlParams);
                        $.ajax($.extend({
                            type: cfg.method,
                            url: data,
                            data: params,
                            beforeSend: cfg.beforeSend,
                            success: function(asyncData){
                                json = typeof(asyncData) === 'string' ? JSON.parse(asyncData) : asyncData;
                                self._processSuggestions(json);
                                $(ms).trigger('load', [ms, json]);
                                if(self._asyncValues){
                                    ms.setValue(typeof(self._asyncValues) === 'string' ? JSON.parse(self._asyncValues) : self._asyncValues);
                                    self._renderSelection();
                                    delete(self._asyncValues);
                                }
                            },
                            error: function(){
                                throw("Could not reach server");
                            }
                        }, cfg.ajaxConfig));
                        return;
                    } else { // results from local array
                        if(data.length > 0 && typeof(data[0]) === 'string') { // results from array of strings
                            _cbData = self._getEntriesFromStringArray(data);
                        } else { // regular json array or json object with results property
                            _cbData = data[cfg.resultsField] || data;
                        }
                    }
                    var sortedData = cfg.mode === 'remote' ? _cbData : self._sortAndTrim(_cbData);
                    self._displaySuggestions(self._group(sortedData));

                }
            },

            /**
             * Render the component to the given input DOM element
             * @private
             */
            _render: function(el) {
                ms.setName(cfg.name);  // make sure the form name is correct
                // holds the main div, will relay the focus events to the contained input element.
                ms.container = $('<div/>', {
                    'class': 'ms-ctn form-control ' + (cfg.resultAsString ? 'ms-as-string ' : '') + cfg.cls +
                        ($(el).hasClass('input-lg') ? ' input-lg' : '') +
                        ($(el).hasClass('input-sm') ? ' input-sm' : '') +
                        (cfg.disabled === true ? ' ms-ctn-disabled' : '') +
                        (cfg.editable === true ? '' : ' ms-ctn-readonly') +
                        (cfg.hideTrigger === false ? '' : ' ms-no-trigger'),
                    style: cfg.style,
                    id: cfg.id
                });
                ms.container.focus($.proxy(handlers._onFocus, this));
                ms.container.blur($.proxy(handlers._onBlur, this));
                ms.container.keydown($.proxy(handlers._onKeyDown, this));
                ms.container.keyup($.proxy(handlers._onKeyUp, this));

                // holds the input field
                ms.input = $('<input/>', $.extend({
                    type: 'text',
                    'class': cfg.editable === true ? '' : ' ms-input-readonly',
                    readonly: !cfg.editable,
                    placeholder: cfg.placeholder,
                    disabled: cfg.disabled
                }, cfg.inputCfg));

                ms.input.focus($.proxy(handlers._onInputFocus, this));
                ms.input.click($.proxy(handlers._onInputClick, this));

                // holds the suggestions. will always be placed on focus
                ms.combobox = $('<div/>', {
                    'class': 'ms-res-ctn dropdown-menu'
                }).height(cfg.maxDropHeight);

                // bind the onclick and mouseover using delegated events (needs jQuery >= 1.7)
                ms.combobox.on('click', 'div.ms-res-item', $.proxy(handlers._onComboItemSelected, this));
                ms.combobox.on('mouseover', 'div.ms-res-item', $.proxy(handlers._onComboItemMouseOver, this));

                if(cfg.selectionContainer){
                    ms.selectionContainer = cfg.selectionContainer;
                    $(ms.selectionContainer).addClass('ms-sel-ctn');
                } else {
                    ms.selectionContainer = $('<div/>', {
                        'class': 'ms-sel-ctn'
                    });
                }
                ms.selectionContainer.click($.proxy(handlers._onFocus, this));

                if(cfg.selectionPosition === 'inner' && !cfg.selectionContainer) {
                    ms.selectionContainer.append(ms.input);
                }
                else {
                    ms.container.append(ms.input);
                }

                ms.helper = $('<span/>', {
                    'class': 'ms-helper ' + cfg.infoMsgCls
                });
                self._updateHelper();
                ms.container.append(ms.helper);


                // Render the whole thing
                $(el).replaceWith(ms.container);

                if(!cfg.selectionContainer){
                    switch(cfg.selectionPosition) {
                        case 'bottom':
                            ms.selectionContainer.insertAfter(ms.container);
                            if(cfg.selectionStacked === true) {
                                ms.selectionContainer.width(ms.container.width());
                                ms.selectionContainer.addClass('ms-stacked');
                            }
                            break;
                        case 'right':
                            ms.selectionContainer.insertAfter(ms.container);
                            ms.container.css('float', 'left');
                            break;
                        default:
                            ms.container.append(ms.selectionContainer);
                            break;
                    }
                }


                // holds the trigger on the right side
                if(cfg.hideTrigger === false) {
                    ms.trigger = $('<div/>', {
                        'class': 'ms-trigger',
                        html: '<div class="ms-trigger-ico"></div>'
                    });
                    ms.trigger.click($.proxy(handlers._onTriggerClick, this));
                    ms.container.append(ms.trigger);
                }

                $(window).resize($.proxy(handlers._onWindowResized, this));

                // do not perform an initial call if we are using ajax unless we have initial values
                if(cfg.value !== null || cfg.data !== null){
                    if(typeof(cfg.data) === 'string'){
                        self._asyncValues = cfg.value;
                        self._processSuggestions();
                    } else {
                        self._processSuggestions();
                        if(cfg.value !== null){
                            ms.setValue(cfg.value);
                            self._renderSelection();
                        }
                    }

                }

                $("body").click(function(e) {
                    if(ms.container.hasClass('ms-ctn-focus') &&
                        ms.container.has(e.target).length === 0 &&
                        e.target.className.indexOf('ms-res-item') < 0 &&
                        e.target.className.indexOf('ms-close-btn') < 0 &&
                        ms.container[0] !== e.target) {
                        handlers._onBlur();
                    }
                });

                if(cfg.expanded === true) {
                    cfg.expanded = false;
                    ms.expand();
                }
            },

            /**
             * Renders each element within the combo box
             * @private
             */
            _renderComboItems: function(items, isGrouped) {
                var ref = this, html = '';
                $.each(items, function(index, value) {
                    var displayed = cfg.renderer !== null ? cfg.renderer.call(ref, value) : value[cfg.displayField];
                    var disabled = cfg.disabledField !== null && value[cfg.disabledField] === true;
                    var resultItemEl = $('<div/>', {
                        'class': 'ms-res-item ' + (isGrouped ? 'ms-res-item-grouped ':'') +
                            (disabled ? 'ms-res-item-disabled ':'') +
                            (index % 2 === 1 && cfg.useZebraStyle === true ? 'ms-res-odd' : ''),
                        html: cfg.highlight === true ? self._highlightSuggestion(displayed) : displayed,
                        'data-json': JSON.stringify(value)
                    });
                    html += $('<div/>').append(resultItemEl).html();
                });
                ms.combobox.append(html);
                _comboItemHeight = ms.combobox.find('.ms-res-item:first').outerHeight();
            },

            /**
             * Renders the selected items into their container.
             * @private
             */
            _renderSelection: function() {
                var ref = this, w = 0, inputOffset = 0, items = [],
                    asText = cfg.resultAsString === true && !_hasFocus;

                ms.selectionContainer.find('.ms-sel-item').remove();
                if(ms._valueContainer !== undefined) {
                    ms._valueContainer.remove();
                }

                $.each(_selection, function(index, value){

                    var selectedItemEl, delItemEl,
                        selectedItemHtml = cfg.selectionRenderer !== null ? cfg.selectionRenderer.call(ref, value) : value[cfg.displayField];

                    var validCls = self._validateSingleItem(value[cfg.displayField]) ? '' : ' ms-sel-invalid';

                    // tag representing selected value
                    if(asText === true) {
                        selectedItemEl = $('<div/>', {
                            'class': 'ms-sel-item ms-sel-text ' + cfg.selectionCls + validCls,
                            html: selectedItemHtml + (index === (_selection.length - 1) ? '' : cfg.resultAsStringDelimiter)
                        }).data('json', value);
                    }
                    else {
                        selectedItemEl = $('<div/>', {
                            'class': 'ms-sel-item ' + cfg.selectionCls + validCls,
                            html: selectedItemHtml
                        }).data('json', value);

                        if(cfg.disabled === false){
                            // small cross img
                            delItemEl = $('<span/>', {
                                'class': 'ms-close-btn'
                            }).data('json', value).appendTo(selectedItemEl);

                            delItemEl.click($.proxy(handlers._onTagTriggerClick, ref));
                        }
                    }

                    items.push(selectedItemEl);
                });
                ms.selectionContainer.prepend(items);

                // store the values, behaviour of multiple select
                ms._valueContainer = $('<div/>', {
                    style: 'display: none;'
                });
                $.each(ms.getValue(), function(i, val){
                    var el = $('<input/>', {
                        type: 'hidden',
                        name: cfg.name,
                        value: val
                    });
                    el.appendTo(ms._valueContainer);
                });
                ms._valueContainer.appendTo(ms.selectionContainer);

                if(cfg.selectionPosition === 'inner' && !cfg.selectionContainer) {
                    ms.input.width(0);
                    inputOffset = ms.input.offset().left - ms.selectionContainer.offset().left;
                    w = ms.container.width() - inputOffset - 42;
                    ms.input.width(w);
                }

                if(_selection.length === cfg.maxSelection){
                    self._updateHelper(cfg.maxSelectionRenderer.call(this, _selection.length));
                } else {
                    ms.helper.hide();
                }
            },

            /**
             * Select an item either through keyboard or mouse
             * @param item
             * @private
             */
            _selectItem: function(item) {
                if(cfg.maxSelection === 1){
                    _selection = [];
                }
                ms.addToSelection(item.data('json'));
                item.removeClass('ms-res-item-active');
                if(cfg.expandOnFocus === false || _selection.length === cfg.maxSelection){
                    ms.collapse();
                }
                if(!_hasFocus){
                    ms.input.focus();
                } else if(_hasFocus && (cfg.expandOnFocus || _ctrlDown)){
                    self._processSuggestions();
                    if(_ctrlDown){
                        ms.expand();
                    }
                }
            },

            /**
             * Sorts the results and cut them down to max # of displayed results at once
             * @private
             */
            _sortAndTrim: function(data) {
                var q = ms.getRawValue(),
                    filtered = [],
                    newSuggestions = [],
                    selectedValues = ms.getValue();
                // filter the data according to given input
                if(q.length > 0) {
                    $.each(data, function(index, obj) {
                        var name = obj[cfg.displayField];
                        if((cfg.matchCase === true && name.indexOf(q) > -1) ||
                            (cfg.matchCase === false && name.toLowerCase().indexOf(q.toLowerCase()) > -1)) {
                            if(cfg.strictSuggest === false || name.toLowerCase().indexOf(q.toLowerCase()) === 0) {
                                filtered.push(obj);
                            }
                        }
                    });
                }
                else {
                    filtered = data;
                }
                // take out the ones that have already been selected
                $.each(filtered, function(index, obj) {
                    if (cfg.allowDuplicates || $.inArray(obj[cfg.valueField], selectedValues) === -1) {
                        newSuggestions.push(obj);
                    }
                });
                // sort the data
                if(cfg.sortOrder !== null) {
                    newSuggestions.sort(function(a,b) {
                        if(a[cfg.sortOrder] < b[cfg.sortOrder]) {
                            return cfg.sortDir === 'asc' ? -1 : 1;
                        }
                        if(a[cfg.sortOrder] > b[cfg.sortOrder]) {
                            return cfg.sortDir === 'asc' ? 1 : -1;
                        }
                        return 0;
                    });
                }
                // trim it down
                if(cfg.maxSuggestions && cfg.maxSuggestions > 0) {
                    newSuggestions = newSuggestions.slice(0, cfg.maxSuggestions);
                }
                return newSuggestions;

            },

            _group: function(data){
                // build groups
                if(cfg.groupBy !== null) {
                    _groups = {};

                    $.each(data, function(index, value) {
                        var props = cfg.groupBy.indexOf('.') > -1 ? cfg.groupBy.split('.') : cfg.groupBy;
                        var prop = value[cfg.groupBy];
                        if(typeof(props) != 'string'){
                            prop = value;
                            while(props.length > 0){
                                prop = prop[props.shift()];
                            }
                        }
                        if(_groups[prop] === undefined) {
                            _groups[prop] = {title: prop, items: [value]};
                        }
                        else {
                            _groups[prop].items.push(value);
                        }
                    });
                }
                return data;
            },

            /**
             * Update the helper text
             * @private
             */
            _updateHelper: function(html) {
                ms.helper.html(html);
                if(!ms.helper.is(":visible")) {
                    ms.helper.fadeIn();
                }
            },

            /**
             * Validate an item against vtype or vregex
             * @private
             */
            _validateSingleItem: function(value){
                if(cfg.vregex !== null && cfg.vregex instanceof RegExp){
                    return cfg.vregex.test(value);
                } else if(cfg.vtype !== null) {
                    switch(cfg.vtype){
                        case 'alpha':
                        return (/^[a-zA-Z_]+$/).test(value);
                        case 'alphanum':
                        return (/^[a-zA-Z0-9_]+$/).test(value);
                        case 'email':
                        return (/^(\w+)([\-+.][\w]+)*@(\w[\-\w]*\.){1,5}([A-Za-z]){2,6}$/).test(value);
                        case 'url':
                        return (/(((^https?)|(^ftp)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i).test(value);
                        case 'ipaddress':
                        return (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(value);
                    }
                }
                return true;
            }
        };

        var handlers = {
            /**
             * Triggered when blurring out of the component
             * @private
             */
            _onBlur: function() {
                ms.container.removeClass('ms-ctn-focus');
                ms.collapse();
                _hasFocus = false;
                if(ms.getRawValue() !== '' && cfg.allowFreeEntries === true){
                    var obj = {};
                    obj[cfg.displayField] = obj[cfg.valueField] = ms.getRawValue().trim();
                    ms.addToSelection(obj);
                }
                self._renderSelection();

                if(ms.isValid() === false) {
                    ms.container.addClass(cfg.invalidCls);
                }

                else if(ms.input.val() !== '' && cfg.allowFreeEntries === false) {
                    ms.empty();
                    self._updateHelper('');
                }

                $(ms).trigger('blur', [ms]);
            },

            /**
             * Triggered when hovering an element in the combo
             * @param e
             * @private
             */
            _onComboItemMouseOver: function(e) {
                var target = $(e.currentTarget);
                if(!target.hasClass('ms-res-item-disabled')){
                    ms.combobox.children().removeClass('ms-res-item-active');
                    target.addClass('ms-res-item-active');
                }
            },

            /**
             * Triggered when an item is chosen from the list
             * @param e
             * @private
             */
            _onComboItemSelected: function(e) {
                var target = $(e.currentTarget);
                if(!target.hasClass('ms-res-item-disabled')){
                    self._selectItem($(e.currentTarget));
                }
            },

            /**
             * Triggered when focusing on the container div. Will focus on the input field instead.
             * @private
             */
            _onFocus: function() {
                ms.input.focus();
            },

            /**
             * Triggered when clicking on the input text field
             * @private
             */
            _onInputClick: function(){
                if (ms.isDisabled() === false && _hasFocus) {
                    if (cfg.toggleOnClick === true) {
                        if (cfg.expanded){
                            ms.collapse();
                        } else {
                            ms.expand();
                        }
                    }
                }
            },

            /**
             * Triggered when focusing on the input text field.
             * @private
             */
            _onInputFocus: function() {
                if(ms.isDisabled() === false && !_hasFocus) {
                    _hasFocus = true;
                    ms.container.addClass('ms-ctn-focus');
                    ms.container.removeClass(cfg.invalidCls);

                    var curLength = ms.getRawValue().length;
                    if(cfg.expandOnFocus === true){
                        ms.expand();
                    }

                    if(_selection.length === cfg.maxSelection) {
                        self._updateHelper(cfg.maxSelectionRenderer.call(this, _selection.length));
                    } else if(curLength < cfg.minChars) {
                        self._updateHelper(cfg.minCharsRenderer.call(this, cfg.minChars - curLength));
                    }

                    self._renderSelection();
                    $(ms).trigger('focus', [ms]);
                }
            },

            /**
             * Triggered when the user presses a key while the component has focus
             * This is where we want to handle all keys that don't require the user input field
             * since it hasn't registered the key hit yet
             * @param e keyEvent
             * @private
             */
            _onKeyDown: function(e) {
                // check how tab should be handled
                var active = ms.combobox.find('.ms-res-item-active:not(.ms-res-item-disabled):first'),
                    freeInput = ms.input.val();
                $(ms).trigger('keydown', [ms, e]);

                if(e.keyCode === KEYCODES.TAB && (cfg.useTabKey === false ||
                    (cfg.useTabKey === true && active.length === 0 && ms.input.val().length === 0))) {
                    handlers._onBlur();
                    return;
                }
                switch(e.keyCode) {
                    case KEYCODES.BACKSPACE:
                        if(freeInput.length === 0 && ms.getSelection().length > 0 && cfg.selectionPosition === 'inner') {
                            _selection.pop();
                            self._renderSelection();
                            $(ms).trigger('selectionchange', [ms, ms.getSelection()]);
                            ms.input.attr('placeholder', (cfg.selectionPosition === 'inner' && ms.getValue().length > 0) ? '' : cfg.placeholder);
                            ms.input.focus();
                            e.preventDefault();
                        }
                        break;
                    case KEYCODES.TAB:
                    case KEYCODES.ESC:
                        e.preventDefault();
                        break;
                    case KEYCODES.ENTER:
                        if(freeInput !== '' || cfg.expanded){
                            e.preventDefault();
                        }
                        break;
                    case KEYCODES.COMMA:
                        if(cfg.useCommaKey === true){
                            e.preventDefault();
                        }
                        break;
                    case KEYCODES.CTRL:
                        _ctrlDown = true;
                        break;
                    case KEYCODES.DOWNARROW:
                        e.preventDefault();
                        self._moveSelectedRow("down");
                        break;
                    case KEYCODES.UPARROW:
                        e.preventDefault();
                        self._moveSelectedRow("up");
                        break;
                    default:
                        if(_selection.length === cfg.maxSelection) {
                            e.preventDefault();
                        }
                        break;
                }
            },

            /**
             * Triggered when a key is released while the component has focus
             * @param e
             * @private
             */
            _onKeyUp: function(e) {
                var freeInput = ms.getRawValue(),
                    inputValid = $.trim(ms.input.val()).length > 0 &&
                        (!cfg.maxEntryLength || $.trim(ms.input.val()).length <= cfg.maxEntryLength),
                    selected,
                    obj = {};

                $(ms).trigger('keyup', [ms, e]);

                clearTimeout(_timer);

                // collapse if escape, but keep focus.
                if(e.keyCode === KEYCODES.ESC && cfg.expanded) {
                    ms.combobox.hide();
                }
                // ignore a bunch of keys
                if((e.keyCode === KEYCODES.TAB && cfg.useTabKey === false) || (e.keyCode > KEYCODES.ENTER && e.keyCode < KEYCODES.SPACE)) {
                    if(e.keyCode === KEYCODES.CTRL){
                        _ctrlDown = false;
                    }
                    return;
                }
                switch(e.keyCode) {
                    case KEYCODES.UPARROW:
                    case KEYCODES.DOWNARROW:
                    e.preventDefault();
                    break;
                    case KEYCODES.ENTER:
                    case KEYCODES.TAB:
                    case KEYCODES.COMMA:
                    if(e.keyCode !== KEYCODES.COMMA || cfg.useCommaKey === true) {
                        e.preventDefault();
                        if(cfg.expanded === true){ // if a selection is performed, select it and reset field
                            selected = ms.combobox.find('.ms-res-item-active:not(.ms-res-item-disabled):first');
                            if(selected.length > 0) {
                                self._selectItem(selected);
                                return;
                            }
                        }
                        // if no selection or if freetext entered and free entries allowed, add new obj to selection
                        if(inputValid === true && cfg.allowFreeEntries === true) {
                            obj[cfg.displayField] = obj[cfg.valueField] = freeInput.trim();
                            ms.addToSelection(obj);
                            ms.collapse(); // reset combo suggestions
                            ms.input.focus();
                        }
                        break;
                    }
                    default:
                        if(_selection.length === cfg.maxSelection){
                            self._updateHelper(cfg.maxSelectionRenderer.call(this, _selection.length));
                        }
                        else {
                            if(freeInput.length < cfg.minChars) {
                                self._updateHelper(cfg.minCharsRenderer.call(this, cfg.minChars - freeInput.length));
                                if(cfg.expanded === true) {
                                    ms.collapse();
                                }
                            }
                            else if(cfg.maxEntryLength && freeInput.length > cfg.maxEntryLength) {
                                self._updateHelper(cfg.maxEntryRenderer.call(this, freeInput.length - cfg.maxEntryLength));
                                if(cfg.expanded === true) {
                                    ms.collapse();
                                }
                            }
                            else {
                                ms.helper.hide();
                                if(cfg.minChars <= freeInput.length){
                                    _timer = setTimeout(function() {
                                        if(cfg.expanded === true) {
                                            self._processSuggestions();
                                        } else {
                                            ms.expand();
                                        }
                                    }, cfg.typeDelay);
                                }
                            }
                        }
                        break;
                }
            },

            /**
             * Triggered when clicking upon cross for deletion
             * @param e
             * @private
             */
            _onTagTriggerClick: function(e) {
                ms.removeFromSelection($(e.currentTarget).data('json'));
            },

            /**
             * Triggered when clicking on the small trigger in the right
             * @private
             */
            _onTriggerClick: function() {
                if(ms.isDisabled() === false && !(cfg.expandOnFocus === true && _selection.length === cfg.maxSelection)) {
                    $(ms).trigger('triggerclick', [ms]);
                    if(cfg.expanded === true) {
                        ms.collapse();
                    } else {
                        var curLength = ms.getRawValue().length;
                        if(curLength >= cfg.minChars){
                            ms.input.focus();
                            ms.expand();
                        } else {
                            self._updateHelper(cfg.minCharsRenderer.call(this, cfg.minChars - curLength));
                        }
                    }
                }
            },

            /**
             * Triggered when the browser window is resized
             * @private
             */
            _onWindowResized: function() {
                self._renderSelection();
            }
        };

        // startup point
        if(element !== null) {
            self._render(element);
        }
    };

    $.fn.magicSuggest = function(options) {
        var obj = $(this);

        if(obj.size() === 1 && obj.data('magicSuggest')) {
            return obj.data('magicSuggest');
        }

        obj.each(function(i) {
            // assume $(this) is an element
            var cntr = $(this);

            // Return early if this element already has a plugin instance
            if(cntr.data('magicSuggest')){
                return;
            }

            if(this.nodeName.toLowerCase() === 'select'){ // rendering from select
                options.data = [];
                options.value = [];
                $.each(this.children, function(index, child){
                    if(child.nodeName && child.nodeName.toLowerCase() === 'option'){
                        options.data.push({id: child.value, name: child.text});
                        if($(child).attr('selected')){
                            options.value.push(child.value);
                        }
                    }
                });
            }

            var def = {};
            // set values from DOM container element
            $.each(this.attributes, function(i, att){
                def[att.name] = att.name === 'value' && att.value !== '' ? JSON.parse(att.value) : att.value;
            });

            var field = new MagicSuggest(this, $.extend([], $.fn.magicSuggest.defaults, options, def));
            cntr.data('magicSuggest', field);
            field.container.data('magicSuggest', field);
        });

        if(obj.size() === 1) {
            return obj.data('magicSuggest');
        }
        return obj;
    };

   $.fn.magicSuggest.defaults = {};
})(jQuery);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImxvYWQuanMiLCJzdGFyX2NvZGUuanMiLCJzaXRlL25pY29sYXNiaXplLW1hZ2ljc3VnZ2VzdC0yMzBiMDhiL21hZ2ljc3VnZ2VzdC1taW4uanMiLCJzaXRlL25pY29sYXNiaXplLW1hZ2ljc3VnZ2VzdC0yMzBiMDhiL21hZ2ljc3VnZ2VzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUFBLE1BQU0sQ0FBQyxRQUFQLEdBQWtCLFNBQUMsTUFBRCxFQUFTLEdBQVQsRUFBYyxNQUFkLEVBQXNCLElBQXRCLEVBQTRCLFFBQTVCO0FBQ2hCLFFBQUE7SUFBQSxRQUFBLEdBQVcsUUFBQSxJQUFZLElBQVosSUFBb0I7SUFDL0IsSUFBQSxHQUFPLElBQUEsSUFBUTtJQUNmLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBb0IsQ0FBdkI7TUFDRSxJQUFBLEdBQU8sT0FEVDs7SUFFQSxJQUFHLFNBQVMsQ0FBQyxNQUFWLEtBQXFCLENBQXhCO01BQ0UsTUFBQSxHQUFTO01BQ1QsSUFBQSxHQUFPLE9BRlQ7O0lBR0EsTUFBQSxHQUFTLE1BQUEsSUFBVTtBQUNuQixTQUFBLFdBQUE7O01BQ0UsSUFBd0IsU0FBeEI7UUFBQSxPQUFPLE1BQU8sQ0FBQSxDQUFBLEVBQWQ7O0FBREY7SUFFQSxTQUFBLEdBQWUsR0FBRyxDQUFDLE1BQUosQ0FBVyxLQUFYLENBQUEsSUFBcUIsQ0FBeEIsR0FBK0IsR0FBL0IsR0FBd0M7V0FDcEQsQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLElBQUEsRUFBTSxNQUFOO01BQ0EsR0FBQSxFQUFLLEVBQUEs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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy5hcGlfY2FsbCA9IChtZXRob2QsIHVybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaykgLT5cbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBkYXRhIHx8IHBhcmFtc1xuICBkYXRhID0gZGF0YSB8fCBwYXJhbXNcbiAgaWYgYXJndW1lbnRzLmxlbmd0aCA9PSA0XG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09ICAzXG4gICAgcGFyYW1zID0gdW5kZWZpbmVkXG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBwYXJhbXMgPSBwYXJhbXMgfHwge31cbiAgZm9yIGssIHYgb2YgcGFyYW1zXG4gICAgZGVsZXRlIHBhcmFtc1trXSBpZiBub3Qgdj9cbiAgc2VwYXJhdG9yID0gaWYgdXJsLnNlYXJjaCgnXFxcXD8nKSA+PSAwIHRoZW4gJyYnIGVsc2UgJz8nXG4gICQuYWpheFxuICAgIHR5cGU6IG1ldGhvZFxuICAgIHVybDogXCIje3VybH0je3NlcGFyYXRvcn0jeyQucGFyYW0gcGFyYW1zfVwiXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGFjY2VwdHM6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICBkYXRhOiBpZiBkYXRhIHRoZW4gSlNPTi5zdHJpbmdpZnkoZGF0YSkgZWxzZSB1bmRlZmluZWRcbiAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgIGlmIGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJ1xuICAgICAgICBtb3JlID0gdW5kZWZpbmVkXG4gICAgICAgIGlmIGRhdGEubmV4dF91cmxcbiAgICAgICAgICBtb3JlID0gKGNhbGxiYWNrKSAtPiBhcGlfY2FsbChtZXRob2QsIGRhdGEubmV4dF91cmwsIHt9LCBjYWxsYmFjaylcbiAgICAgICAgY2FsbGJhY2s/IHVuZGVmaW5lZCwgZGF0YS5yZXN1bHQsIG1vcmVcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2s/IGRhdGFcbiAgICBlcnJvcjogKGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93bikgLT5cbiAgICAgIGVycm9yID1cbiAgICAgICAgZXJyb3JfY29kZTogJ2FqYXhfZXJyb3InXG4gICAgICAgIHRleHRfc3RhdHVzOiB0ZXh0U3RhdHVzXG4gICAgICAgIGVycm9yX3Rocm93bjogZXJyb3JUaHJvd25cbiAgICAgICAganFYSFI6IGpxWEhSXG4gICAgICB0cnlcbiAgICAgICAgZXJyb3IgPSAkLnBhcnNlSlNPTihqcVhIUi5yZXNwb25zZVRleHQpIGlmIGpxWEhSLnJlc3BvbnNlVGV4dFxuICAgICAgY2F0Y2ggZVxuICAgICAgICBlcnJvciA9IGVycm9yXG4gICAgICBMT0cgJ2FwaV9jYWxsIGVycm9yJywgZXJyb3JcbiAgICAgIGNhbGxiYWNrPyBlcnJvclxuIiwiKC0+XG4gIGNsYXNzIHdpbmRvdy5GaWxlVXBsb2FkZXJcbiAgICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zKSAtPlxuICAgICAgQHVwbG9hZF9oYW5kbGVyID0gQG9wdGlvbnMudXBsb2FkX2hhbmRsZXJcbiAgICAgIEBzZWxlY3RvciA9IEBvcHRpb25zLnNlbGVjdG9yXG4gICAgICBAZHJvcF9hcmVhID0gQG9wdGlvbnMuZHJvcF9hcmVhXG4gICAgICBAdXBsb2FkX3VybCA9IEBvcHRpb25zLnVwbG9hZF91cmwgb3IgXCIvYXBpL3YxI3t3aW5kb3cubG9jYXRpb24ucGF0aG5hbWV9XCJcbiAgICAgIEBjb25maXJtX21lc3NhZ2UgPSBAb3B0aW9ucy5jb25maXJtX21lc3NhZ2Ugb3IgJ0ZpbGVzIGFyZSBzdGlsbCBiZWluZyB1cGxvYWRlZC4nXG4gICAgICBAYWxsb3dlZF90eXBlcyA9IEBvcHRpb25zLmFsbG93ZWRfdHlwZXNcbiAgICAgIEBtYXhfc2l6ZSA9IEBvcHRpb25zLm1heF9zaXplXG5cbiAgICAgIEBhY3RpdmVfZmlsZXMgPSAwXG5cbiAgICAgIEBzZWxlY3Rvcj8uYmluZCAnY2hhbmdlJywgKGUpID0+XG4gICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyKGUpXG5cbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiBAZHJvcF9hcmVhPyBhbmQgeGhyLnVwbG9hZFxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcmFnb3ZlcicsIEBmaWxlX2RyYWdfaG92ZXJcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJhZ2xlYXZlJywgQGZpbGVfZHJhZ19ob3ZlclxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcm9wJywgKGUpID0+XG4gICAgICAgICAgQGZpbGVfc2VsZWN0X2hhbmRsZXIgZVxuICAgICAgICBAZHJvcF9hcmVhLnNob3coKVxuXG4gICAgICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSA9PlxuICAgICAgICBpZiBAY29uZmlybV9tZXNzYWdlPyBhbmQgQGFjdGl2ZV9maWxlcyA+IDBcbiAgICAgICAgICByZXR1cm4gQGNvbmZpcm1fbWVzc2FnZVxuXG4gICAgZmlsZV9kcmFnX2hvdmVyOiAoZSkgPT5cbiAgICAgIGlmIG5vdCBAZHJvcF9hcmVhP1xuICAgICAgICByZXR1cm5cbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgaWYgZS50eXBlIGlzICdkcmFnb3ZlcidcbiAgICAgICAgQGRyb3BfYXJlYS5hZGRDbGFzcyAnZHJhZy1ob3ZlcidcbiAgICAgIGVsc2VcbiAgICAgICAgQGRyb3BfYXJlYS5yZW1vdmVDbGFzcyAnZHJhZy1ob3ZlcidcblxuICAgIGZpbGVfc2VsZWN0X2hhbmRsZXI6IChlKSA9PlxuICAgICAgQGZpbGVfZHJhZ19ob3ZlcihlKVxuICAgICAgZmlsZXMgPSBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyPy5maWxlcyBvciBlLnRhcmdldD8uZmlsZXMgb3IgZS5kYXRhVHJhbnNmZXI/LmZpbGVzXG4gICAgICBpZiBmaWxlcz8ubGVuZ3RoID4gMFxuICAgICAgICBAdXBsb2FkX2ZpbGVzKGZpbGVzKVxuXG4gICAgdXBsb2FkX2ZpbGVzOiAoZmlsZXMpID0+XG4gICAgICBAZ2V0X3VwbG9hZF91cmxzIGZpbGVzLmxlbmd0aCwgKGVycm9yLCB1cmxzKSA9PlxuICAgICAgICBpZiBlcnJvclxuICAgICAgICAgIGNvbnNvbGUubG9nICdFcnJvciBnZXR0aW5nIFVSTHMnLCBlcnJvclxuICAgICAgICAgIHJldHVyblxuICAgICAgICBAcHJvY2Vzc19maWxlcyBmaWxlcywgdXJscywgMFxuXG4gICAgZ2V0X3VwbG9hZF91cmxzOiAobiwgY2FsbGJhY2spID0+XG4gICAgICByZXR1cm4gaWYgbiA8PSAwXG4gICAgICBhcGlfY2FsbCAnR0VUJywgQHVwbG9hZF91cmwsIHtjb3VudDogbn0sIChlcnJvciwgcmVzdWx0KSAtPlxuICAgICAgICBpZiBlcnJvclxuICAgICAgICAgIGNhbGxiYWNrIGVycm9yXG4gICAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgICAgY2FsbGJhY2sgdW5kZWZpbmVkLCByZXN1bHRcblxuICAgIHByb2Nlc3NfZmlsZXM6IChmaWxlcywgdXJscywgaSkgPT5cbiAgICAgIHJldHVybiBpZiBpID49IGZpbGVzLmxlbmd0aFxuICAgICAgQHVwbG9hZF9maWxlIGZpbGVzW2ldLCB1cmxzW2ldLnVwbG9hZF91cmwsIEB1cGxvYWRfaGFuZGxlcj8ucHJldmlldyhmaWxlc1tpXSksICgpID0+XG4gICAgICAgIEBwcm9jZXNzX2ZpbGVzIGZpbGVzLCB1cmxzLCBpICsgMSwgQHVwbG9hZF9oYW5kbGVyP1xuXG4gICAgdXBsb2FkX2ZpbGU6IChmaWxlLCB1cmwsIHByb2dyZXNzLCBjYWxsYmFjaykgPT5cbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiBAYWxsb3dlZF90eXBlcz8ubGVuZ3RoID4gMFxuICAgICAgICBpZiBmaWxlLnR5cGUgbm90IGluIEBhbGxvd2VkX3R5cGVzXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnd3JvbmdfdHlwZSdcbiAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIEBtYXhfc2l6ZT9cbiAgICAgICAgaWYgZmlsZS5zaXplID4gQG1heF9zaXplXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAndG9vX2JpZydcbiAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICMgJCgnI2ltYWdlJykudmFsKGZpbGUubmFtZSk7XG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIgJ3Byb2dyZXNzJywgKGV2ZW50KSAtPlxuICAgICAgICBwcm9ncmVzcyBwYXJzZUludCBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCAqIDEwMC4wXG5cbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoZXZlbnQpID0+XG4gICAgICAgIGlmIHhoci5yZWFkeVN0YXRlID09IDRcbiAgICAgICAgICBpZiB4aHIuc3RhdHVzID09IDIwMFxuICAgICAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpXG4gICAgICAgICAgICBwcm9ncmVzcyAxMDAuMCwgcmVzcG9uc2UucmVzdWx0XG4gICAgICAgICAgICAjIC8vJCgnI2NvbnRlbnQnKS52YWwoeGhyLnJlc3BvbnNlVGV4dClcbiAgICAgICAgICAgICQoJyNpbWFnZScpLnZhbCgkKCcjaW1hZ2UnKS52YWwoKSAgKyByZXNwb25zZS5yZXN1bHQuaWQgKyAnOycpO1xuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnZXJyb3InXG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcblxuICAgICAgeGhyLm9wZW4gJ1BPU1QnLCB1cmwsIHRydWVcbiAgICAgIGRhdGEgPSBuZXcgRm9ybURhdGEoKVxuICAgICAgZGF0YS5hcHBlbmQgJ2ZpbGUnLCBmaWxlXG4gICAgICB4aHIuc2VuZCBkYXRhXG4gICAgICBjYWxsYmFjaygpXG4pKCkiLCJ3aW5kb3cuTE9HID0gLT5cbiAgY29uc29sZT8ubG9nPyBhcmd1bWVudHMuLi5cblxuXG53aW5kb3cuaW5pdF9jb21tb24gPSAtPlxuICBpbml0X2xvYWRpbmdfYnV0dG9uKClcbiAgaW5pdF9jb25maXJtX2J1dHRvbigpXG4gIGluaXRfcGFzc3dvcmRfc2hvd19idXR0b24oKVxuICBpbml0X3RpbWUoKVxuICBpbml0X2Fubm91bmNlbWVudCgpXG4gIGluaXRfcm93X2xpbmsoKVxuXG5cbndpbmRvdy5pbml0X2xvYWRpbmdfYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWxvYWRpbmcnLCAtPlxuICAgICQodGhpcykuYnV0dG9uICdsb2FkaW5nJ1xuXG5cbndpbmRvdy5pbml0X2NvbmZpcm1fYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWNvbmZpcm0nLCAtPlxuICAgIGlmIG5vdCBjb25maXJtICQodGhpcykuZGF0YSgnbWVzc2FnZScpIG9yICdBcmUgeW91IHN1cmU/J1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuXG5cbndpbmRvdy5pbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLXBhc3N3b3JkLXNob3cnLCAtPlxuICAgICR0YXJnZXQgPSAkKCQodGhpcykuZGF0YSAndGFyZ2V0JylcbiAgICAkdGFyZ2V0LmZvY3VzKClcbiAgICBpZiAkKHRoaXMpLmhhc0NsYXNzICdhY3RpdmUnXG4gICAgICAkdGFyZ2V0LmF0dHIgJ3R5cGUnLCAncGFzc3dvcmQnXG4gICAgZWxzZVxuICAgICAgJHRhcmdldC5hdHRyICd0eXBlJywgJ3RleHQnXG5cblxud2luZG93LmluaXRfdGltZSA9IC0+XG4gIGlmICQoJ3RpbWUnKS5sZW5ndGggPiAwXG4gICAgcmVjYWxjdWxhdGUgPSAtPlxuICAgICAgJCgndGltZVtkYXRldGltZV0nKS5lYWNoIC0+XG4gICAgICAgIGRhdGUgPSBtb21lbnQudXRjICQodGhpcykuYXR0ciAnZGF0ZXRpbWUnXG4gICAgICAgIGRpZmYgPSBtb21lbnQoKS5kaWZmIGRhdGUgLCAnZGF5cydcbiAgICAgICAgaWYgZGlmZiA+IDI1XG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUubG9jYWwoKS5mb3JtYXQgJ1lZWVktTU0tREQnXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAkKHRoaXMpLnRleHQgZGF0ZS5mcm9tTm93KClcbiAgICAgICAgJCh0aGlzKS5hdHRyICd0aXRsZScsIGRhdGUubG9jYWwoKS5mb3JtYXQgJ2RkZGQsIE1NTU0gRG8gWVlZWSwgSEg6bW06c3MgWidcbiAgICAgIHNldFRpbWVvdXQgYXJndW1lbnRzLmNhbGxlZSwgMTAwMCAqIDQ1XG4gICAgcmVjYWxjdWxhdGUoKVxuXG5cbndpbmRvdy5pbml0X2Fubm91bmNlbWVudCA9IC0+XG4gICQoJy5hbGVydC1hbm5vdW5jZW1lbnQgYnV0dG9uLmNsb3NlJykuY2xpY2sgLT5cbiAgICBzZXNzaW9uU3RvcmFnZT8uc2V0SXRlbSAnY2xvc2VkQW5ub3VuY2VtZW50JywgJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLmh0bWwoKVxuXG4gIGlmIHNlc3Npb25TdG9yYWdlPy5nZXRJdGVtKCdjbG9zZWRBbm5vdW5jZW1lbnQnKSAhPSAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXG4gICAgJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLnNob3coKVxuXG5cbndpbmRvdy5pbml0X3Jvd19saW5rID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcucm93LWxpbmsnLCAtPlxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJCh0aGlzKS5kYXRhICdocmVmJ1xuXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLm5vdC1saW5rJywgKGUpIC0+XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuXG5cbndpbmRvdy5jbGVhcl9ub3RpZmljYXRpb25zID0gLT5cbiAgJCgnI25vdGlmaWNhdGlvbnMnKS5lbXB0eSgpXG5cblxud2luZG93LnNob3dfbm90aWZpY2F0aW9uID0gKG1lc3NhZ2UsIGNhdGVnb3J5PSd3YXJuaW5nJykgLT5cbiAgY2xlYXJfbm90aWZpY2F0aW9ucygpXG4gIHJldHVybiBpZiBub3QgbWVzc2FnZVxuXG4gICQoJyNub3RpZmljYXRpb25zJykuYXBwZW5kIFwiXCJcIlxuICAgICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LWRpc21pc3NhYmxlIGFsZXJ0LSN7Y2F0ZWdvcnl9XCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2xvc2VcIiBkYXRhLWRpc21pc3M9XCJhbGVydFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPiZ0aW1lczs8L2J1dHRvbj5cbiAgICAgICAgI3ttZXNzYWdlfVxuICAgICAgPC9kaXY+XG4gICAgXCJcIlwiXG5cblxud2luZG93LnNpemVfaHVtYW4gPSAobmJ5dGVzKSAtPlxuICBmb3Igc3VmZml4IGluIFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddXG4gICAgaWYgbmJ5dGVzIDwgMTAwMFxuICAgICAgaWYgc3VmZml4ID09ICdCJ1xuICAgICAgICByZXR1cm4gXCIje25ieXRlc30gI3tzdWZmaXh9XCJcbiAgICAgIHJldHVybiBcIiN7cGFyc2VJbnQobmJ5dGVzICogMTApIC8gMTB9ICN7c3VmZml4fVwiXG4gICAgbmJ5dGVzIC89IDEwMjQuMFxuIiwiJCAtPlxuICBpbml0X2NvbW1vbigpXG5cbiQgLT4gJCgnaHRtbC5hdXRoJykuZWFjaCAtPlxuICBpbml0X2F1dGgoKVxuXG4kIC0+ICQoJ2h0bWwudXNlci1saXN0JykuZWFjaCAtPlxuICBpbml0X3VzZXJfbGlzdCgpXG5cbiQgLT4gJCgnaHRtbC51c2VyLW1lcmdlJykuZWFjaCAtPlxuICBpbml0X3VzZXJfbWVyZ2UoKVxuXG4kIC0+ICQoJ2h0bWwucmVzb3VyY2UtbGlzdCcpLmVhY2ggLT5cbiAgaW5pdF9yZXNvdXJjZV9saXN0KClcblxuJCAtPiAkKCdodG1sLnJlc291cmNlLXZpZXcnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfdmlldygpXG5cbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS11cGxvYWQnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfdXBsb2FkKCkiLCJ3aW5kb3cuaW5pdF9hdXRoID0gLT5cbiAgJCgnLnJlbWVtYmVyJykuY2hhbmdlIC0+XG4gICAgYnV0dG9ucyA9ICQoJy5idG4tc29jaWFsJykudG9BcnJheSgpLmNvbmNhdCAkKCcuYnRuLXNvY2lhbC1pY29uJykudG9BcnJheSgpXG4gICAgZm9yIGJ1dHRvbiBpbiBidXR0b25zXG4gICAgICBocmVmID0gJChidXR0b24pLnByb3AgJ2hyZWYnXG4gICAgICBpZiAkKCcucmVtZW1iZXIgaW5wdXQnKS5pcyAnOmNoZWNrZWQnXG4gICAgICAgICQoYnV0dG9uKS5wcm9wICdocmVmJywgXCIje2hyZWZ9JnJlbWVtYmVyPXRydWVcIlxuICAgICAgICAkKCcjcmVtZW1iZXInKS5wcm9wICdjaGVja2VkJywgdHJ1ZVxuICAgICAgZWxzZVxuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIGhyZWYucmVwbGFjZSAnJnJlbWVtYmVyPXRydWUnLCAnJ1xuICAgICAgICAkKCcjcmVtZW1iZXInKS5wcm9wICdjaGVja2VkJywgZmFsc2VcblxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UoKVxuIiwiIyBodHRwOi8vYmxvZy5hbm9yZ2FuLmNvbS8yMDEyLzA5LzMwL3ByZXR0eS1tdWx0aS1maWxlLXVwbG9hZC1ib290c3RyYXAtanF1ZXJ5LXR3aWctc2lsZXgvXG5pZiAkKFwiLnByZXR0eS1maWxlXCIpLmxlbmd0aFxuICAkKFwiLnByZXR0eS1maWxlXCIpLmVhY2ggKCkgLT5cbiAgICBwcmV0dHlfZmlsZSA9ICQodGhpcylcbiAgICBmaWxlX2lucHV0ID0gcHJldHR5X2ZpbGUuZmluZCgnaW5wdXRbdHlwZT1cImZpbGVcIl0nKVxuICAgIGZpbGVfaW5wdXQuaGlkZSgpXG4gICAgZmlsZV9pbnB1dC5jaGFuZ2UgKCkgLT5cbiAgICAgIGZpbGVzID0gZmlsZV9pbnB1dFswXS5maWxlc1xuICAgICAgaW5mbyA9IFwiXCJcbiAgICAgIGlmIGZpbGVzLmxlbmd0aCA+IDFcbiAgICAgICAgaW5mbyA9IFwiI3tmaWxlcy5sZW5ndGh9IGZpbGVzIHNlbGVjdGVkXCJcbiAgICAgIGVsc2VcbiAgICAgICAgcGF0aCA9IGZpbGVfaW5wdXQudmFsKCkuc3BsaXQoXCJcXFxcXCIpXG4gICAgICAgIGluZm8gPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV1cbiAgICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXAgaW5wdXRcIikudmFsKGluZm8pXG4gICAgcHJldHR5X2ZpbGUuZmluZChcIi5pbnB1dC1ncm91cFwiKS5jbGljayAoZSkgLT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgZmlsZV9pbnB1dC5jbGljaygpXG4gICAgICAkKHRoaXMpLmJsdXIoKVxuIiwid2luZG93LmluaXRfcmVzb3VyY2VfbGlzdCA9ICgpIC0+XG4gIGluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbigpXG5cbndpbmRvdy5pbml0X3Jlc291cmNlX3ZpZXcgPSAoKSAtPlxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxuXG53aW5kb3cuaW5pdF9yZXNvdXJjZV91cGxvYWQgPSAoKSAtPlxuICBpZiB3aW5kb3cuRmlsZSBhbmQgd2luZG93LkZpbGVMaXN0IGFuZCB3aW5kb3cuRmlsZVJlYWRlclxuICAgIHdpbmRvdy5maWxlX3VwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlclxuICAgICAgdXBsb2FkX2hhbmRsZXI6IHVwbG9hZF9oYW5kbGVyXG4gICAgICBzZWxlY3RvcjogJCgnLmZpbGUnKVxuICAgICAgZHJvcF9hcmVhOiAkKCcuZHJvcC1hcmVhJylcbiAgICAgIGNvbmZpcm1fbWVzc2FnZTogJ0ZpbGVzIGFyZSBzdGlsbCBiZWluZyB1cGxvYWRlZC4nXG4gICAgICB1cGxvYWRfdXJsOiAkKCcuZmlsZScpLmRhdGEoJ2dldC11cGxvYWQtdXJsJylcbiAgICAgIGFsbG93ZWRfdHlwZXM6IFtdXG4gICAgICBtYXhfc2l6ZTogMTAyNCAqIDEwMjQgKiAxMDI0XG5cbnVwbG9hZF9oYW5kbGVyID1cbiAgcHJldmlldzogKGZpbGUpIC0+XG4gICAgJHJlc291cmNlID0gJCBcIlwiXCJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC1sZy0yIGNvbC1tZC0zIGNvbC1zbS00IGNvbC14cy02XCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInRodW1ibmFpbFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXZpZXdcIj48L2Rpdj5cbiAgICAgICAgICAgIDxoNT4je2ZpbGUubmFtZX08L2g1PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1iYXJcIiBzdHlsZT1cIndpZHRoOiAwJTtcIj48L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLXRleHRcIj48L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIFwiXCJcIlxuICAgICRwcmV2aWV3ID0gJCgnLnByZXZpZXcnLCAkcmVzb3VyY2UpXG5cbiAgICBpZiBmaWxlX3VwbG9hZGVyLmFjdGl2ZV9maWxlcyA8IDE2IGFuZCBmaWxlLnR5cGUuaW5kZXhPZihcImltYWdlXCIpIGlzIDBcbiAgICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICAgIHJlYWRlci5vbmxvYWQgPSAoZSkgPT5cbiAgICAgICAgJHByZXZpZXcuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgXCJ1cmwoI3tlLnRhcmdldC5yZXN1bHR9KVwiKVxuICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSlcbiAgICBlbHNlXG4gICAgICAkcHJldmlldy50ZXh0KGZpbGUudHlwZSBvciAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJylcblxuICAgICQoJy5yZXNvdXJjZS11cGxvYWRzJykucHJlcGVuZCgkcmVzb3VyY2UpXG5cbiAgICAocHJvZ3Jlc3MsIHJlc291cmNlLCBlcnJvcikgPT5cbiAgICAgIGlmIGVycm9yXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCAnMTAwJScpXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItZGFuZ2VyJylcbiAgICAgICAgaWYgZXJyb3IgPT0gJ3Rvb19iaWcnXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJGYWlsZWQhIFRvbyBiaWcsIG1heDogI3tzaXplX2h1bWFuKGZpbGVfdXBsb2FkZXIubWF4X3NpemUpfS5cIilcbiAgICAgICAgZWxzZSBpZiBlcnJvciA9PSAnd3JvbmdfdHlwZSdcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgV3JvbmcgZmlsZSB0eXBlLlwiKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoJ0ZhaWxlZCEnKVxuICAgICAgICByZXR1cm5cblxuICAgICAgaWYgcHJvZ3Jlc3MgPT0gMTAwLjAgYW5kIHJlc291cmNlXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItc3VjY2VzcycpXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiU3VjY2VzcyAje3NpemVfaHVtYW4oZmlsZS5zaXplKX1cIilcbiAgICAgICAgaWYgcmVzb3VyY2UuaW1hZ2VfdXJsIGFuZCAkcHJldmlldy50ZXh0KCkubGVuZ3RoID4gMFxuICAgICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7cmVzb3VyY2UuaW1hZ2VfdXJsfSlcIilcbiAgICAgICAgICAkcHJldmlldy50ZXh0KCcnKVxuICAgICAgZWxzZSBpZiBwcm9ncmVzcyA9PSAxMDAuMFxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIjEwMCUgLSBQcm9jZXNzaW5nLi5cIilcbiAgICAgIGVsc2VcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsIFwiI3twcm9ncmVzc30lXCIpXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiI3twcm9ncmVzc30lIG9mICN7c2l6ZV9odW1hbihmaWxlLnNpemUpfVwiKVxuXG5cbndpbmRvdy5pbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24gPSAoKSAtPlxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tZGVsZXRlJywgKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgaWYgY29uZmlybSgnUHJlc3MgT0sgdG8gZGVsZXRlIHRoZSByZXNvdXJjZScpXG4gICAgICAkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCAkKHRoaXMpLmRhdGEoJ2FwaS11cmwnKSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICBpZiBlcnJcbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcbiAgICAgICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nIGR1cmluZyBkZWxldGUhJywgZXJyXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIHRhcmdldCA9ICQodGhpcykuZGF0YSgndGFyZ2V0JylcbiAgICAgICAgcmVkaXJlY3RfdXJsID0gJCh0aGlzKS5kYXRhKCdyZWRpcmVjdC11cmwnKVxuICAgICAgICBpZiB0YXJnZXRcbiAgICAgICAgICAkKFwiI3t0YXJnZXR9XCIpLnJlbW92ZSgpXG4gICAgICAgIGlmIHJlZGlyZWN0X3VybFxuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVkaXJlY3RfdXJsIiwid2luZG93LmluaXRfdXNlcl9saXN0ID0gLT5cbiAgaW5pdF91c2VyX3NlbGVjdGlvbnMoKVxuICBpbml0X3VzZXJfZGVsZXRlX2J0bigpXG4gIGluaXRfdXNlcl9tZXJnZV9idG4oKVxuXG5cbmluaXRfdXNlcl9zZWxlY3Rpb25zID0gLT5cbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICB1c2VyX3NlbGVjdF9yb3cgJCh0aGlzKVxuXG4gICQoJyNzZWxlY3QtYWxsJykuY2hhbmdlIC0+XG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnByb3AgJ2NoZWNrZWQnLCAkKHRoaXMpLmlzICc6Y2hlY2tlZCdcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuZWFjaCAtPlxuICAgICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuY2hhbmdlIC0+XG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuXG51c2VyX3NlbGVjdF9yb3cgPSAoJGVsZW1lbnQpIC0+XG4gIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuZWFjaCAtPlxuICAgIGlkID0gJGVsZW1lbnQudmFsKClcbiAgICAkKFwiIyN7aWR9XCIpLnRvZ2dsZUNsYXNzICd3YXJuaW5nJywgJGVsZW1lbnQuaXMgJzpjaGVja2VkJ1xuXG5cbnVwZGF0ZV91c2VyX3NlbGVjdGlvbnMgPSAtPlxuICBzZWxlY3RlZCA9ICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxuICAkKCcjdXNlci1hY3Rpb25zJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkID09IDBcbiAgJCgnI3VzZXItbWVyZ2UnKS50b2dnbGVDbGFzcyAnaGlkZGVuJywgc2VsZWN0ZWQgPCAyXG4gIGlmIHNlbGVjdGVkIGlzIDBcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXG4gIGVsc2UgaWYgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpub3QoOmNoZWNrZWQpJykubGVuZ3RoIGlzIDBcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIHRydWVcbiAgZWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnaW5kZXRlcm1pbmF0ZScsIHRydWVcblxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIERlbGV0ZSBVc2VycyBTdHVmZlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuaW5pdF91c2VyX2RlbGV0ZV9idG4gPSAtPlxuICAkKCcjdXNlci1kZWxldGUnKS5jbGljayAoZSkgLT5cbiAgICBjbGVhcl9ub3RpZmljYXRpb25zKClcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBjb25maXJtX21lc3NhZ2UgPSAoJCh0aGlzKS5kYXRhICdjb25maXJtJykucmVwbGFjZSAne3VzZXJzfScsICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxuICAgIGlmIGNvbmZpcm0gY29uZmlybV9tZXNzYWdlXG4gICAgICB1c2VyX2tleXMgPSBbXVxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxuICAgICAgICAkKHRoaXMpLmF0dHIgJ2Rpc2FibGVkJywgdHJ1ZVxuICAgICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXG4gICAgICBkZWxldGVfdXJsID0gJCh0aGlzKS5kYXRhICdhcGktdXJsJ1xuICAgICAgc3VjY2Vzc19tZXNzYWdlID0gJCh0aGlzKS5kYXRhICdzdWNjZXNzJ1xuICAgICAgZXJyb3JfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnZXJyb3InXG4gICAgICBhcGlfY2FsbCAnREVMRVRFJywgZGVsZXRlX3VybCwge3VzZXJfa2V5czogdXNlcl9rZXlzLmpvaW4oJywnKX0sIChlcnIsIHJlc3VsdCkgLT5cbiAgICAgICAgaWYgZXJyXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpkaXNhYmxlZCcpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIGVycm9yX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnZGFuZ2VyJ1xuICAgICAgICAgIHJldHVyblxuICAgICAgICAkKFwiIyN7cmVzdWx0LmpvaW4oJywgIycpfVwiKS5mYWRlT3V0IC0+XG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKVxuICAgICAgICAgIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIHN1Y2Nlc3NfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdzdWNjZXNzJ1xuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgTWVyZ2UgVXNlcnMgU3R1ZmZcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbndpbmRvdy5pbml0X3VzZXJfbWVyZ2UgPSAtPlxuICB1c2VyX2tleXMgPSAkKCcjdXNlcl9rZXlzJykudmFsKClcbiAgYXBpX3VybCA9ICQoJy5hcGktdXJsJykuZGF0YSAnYXBpLXVybCdcbiAgYXBpX2NhbGwgJ0dFVCcsIGFwaV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5c30sIChlcnJvciwgcmVzdWx0KSAtPlxuICAgIGlmIGVycm9yXG4gICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nJ1xuICAgICAgcmV0dXJuXG4gICAgd2luZG93LnVzZXJfZGJzID0gcmVzdWx0XG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xuXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgKGV2ZW50KSAtPlxuICAgIHVzZXJfa2V5ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KS52YWwoKVxuICAgIHNlbGVjdF9kZWZhdWx0X3VzZXIgdXNlcl9rZXlcblxuXG5zZWxlY3RfZGVmYXVsdF91c2VyID0gKHVzZXJfa2V5KSAtPlxuICAkKCcudXNlci1yb3cnKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpLmFkZENsYXNzICdkYW5nZXInXG4gICQoXCIjI3t1c2VyX2tleX1cIikucmVtb3ZlQ2xhc3MoJ2RhbmdlcicpLmFkZENsYXNzICdzdWNjZXNzJ1xuXG4gIGZvciB1c2VyX2RiIGluIHVzZXJfZGJzXG4gICAgaWYgdXNlcl9rZXkgPT0gdXNlcl9kYi5rZXlcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9rZXldJykudmFsIHVzZXJfZGIua2V5XG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJuYW1lXScpLnZhbCB1c2VyX2RiLnVzZXJuYW1lXG4gICAgICAkKCdpbnB1dFtuYW1lPW5hbWVdJykudmFsIHVzZXJfZGIubmFtZVxuICAgICAgJCgnaW5wdXRbbmFtZT1lbWFpbF0nKS52YWwgdXNlcl9kYi5lbWFpbFxuICAgICAgYnJlYWtcblxuXG5pbml0X3VzZXJfbWVyZ2VfYnRuID0gLT5cbiAgJCgnI3VzZXItbWVyZ2UnKS5jbGljayAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICB1c2VyX2tleXMgPSBbXVxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmVhY2ggLT5cbiAgICAgIHVzZXJfa2V5cy5wdXNoICQodGhpcykudmFsKClcbiAgICB1c2VyX21lcmdlX3VybCA9ICQodGhpcykuZGF0YSAndXNlci1tZXJnZS11cmwnXG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBcIiN7dXNlcl9tZXJnZV91cmx9P3VzZXJfa2V5cz0je3VzZXJfa2V5cy5qb2luKCcsJyl9XCJcbiIsIlxuZnVuY3Rpb24gZm9sbG93RnVuY3Rpb24oeCwgeSkge1xuXG4gICAgYXBpX3VybCA9ICcvYXBpL3YxL2ZvbGxvdy8nICsgeSArICcvJztcblxuICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibGFiZWwtZGVmYXVsdFwiKSl7XG4gICAgICAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcIm5vdC1sb2dnZWQtaW5cIikpe1xuLy8gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5jc3Moe1widmlzaWJpbGl0eVwiOlwidmlzaWJsZVwiLFwiZGlzcGxheVwiOlwiYmxvY2tcIn0pO1xuICAgICAgICAgICAgJChcIi5yZWNvbW1lbmRlclwiKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5mYWRlSW4oKTtcbi8vICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVPdXQoKTtcbiAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImxhYmVsLWRlZmF1bHRcIilcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LmFkZChcImxhYmVsLXN1Y2Nlc3NcIilcbiAgICAgICAgICAgIHguaW5uZXJIVE1MPSdGT0xMT1dJTkcnO1xuICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCwgICAgLy9Zb3VyIGFwaSB1cmxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQVVQnLCAgIC8vdHlwZSBpcyBhbnkgSFRUUCBtZXRob2RcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgICAgICAvL0RhdGEgYXMganMgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgIH1cblxuICAgIH0gZWxzZSBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImxhYmVsLXN1Y2Nlc3NcIikpe1xuXG4gICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImxhYmVsLXN1Y2Nlc3NcIilcbiAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtZGVmYXVsdFwiKVxuICAgICAgICB4LmlubmVySFRNTCA9ICdGT0xMT1cnO1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgO1xuICAgIH1cblxufVxuXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG4gICQodGhpcykuY2xvc2VzdCgnLmNhcmQnKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICQoXCIucmVjb21tZW5kZXJcIikuZmFkZUluKCk7XG59KSIsIlxudmFyIGtleXdvcmRzID0gbmV3IEJsb29kaG91bmQoe1xuICAgIGRhdHVtVG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMub2JqLndoaXRlc3BhY2UoJ25hbWUnKSxcbiAgICBxdWVyeVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLndoaXRlc3BhY2UsXG4gICAgcHJlZmV0Y2g6IHtcbiAgICB1cmw6ICcva2V5d29yZHMnLFxuICAgIGZpbHRlcjogZnVuY3Rpb24obGlzdCkge1xuICAgICAgcmV0dXJuICQubWFwKGxpc3QsIGZ1bmN0aW9uKGNpdHluYW1lKSB7XG4gICAgICAgIHJldHVybiB7IG5hbWU6IGNpdHluYW1lIH07IH0pO1xuICAgIH1cbiAgfVxuXG59KTtcblxua2V5d29yZHMuaW5pdGlhbGl6ZSgpO1xuXG4kKCcjc2VhcmNoJykudHlwZWFoZWFkKG51bGwsIHtcbiAgICAgbWlubGVuZ3RoOiAxLFxuICAgICBuYW1lOiAna2V5d29yZHMnLFxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXG4gICAgIHZhbHVlS2V5OiAnbmFtZScsXG4gICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcbn0pO1xuXG5cbiQoJyNrZXl3b3JkcycpLnRhZ3NpbnB1dCh7XG4gICAgY29uZmlybUtleXM6IFsxMywgMzIsIDQ0XSxcbiAgICB0eXBlYWhlYWRqczogW3tcbiAgICAgICAgICBtaW5MZW5ndGg6IDEsXG4gICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuXG4gICAgfSx7XG4gICAgICAgIG1pbmxlbmd0aDogMSxcbiAgICAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgICAgZGlzcGxheUtleTogJ25hbWUnLFxuICAgICAgICB2YWx1ZUtleTogJ25hbWUnLFxuICAgICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXG4gICAgfV0sXG4gICAgZnJlZUlucHV0OiB0cnVlLFxuXG59KTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbn0pO1xuXG4iLCJcbmZ1bmN0aW9uIHN0YXJGdW5jdGlvbih4LCB5KSB7XG5cbiAgICBhcGlfdXJsID0gJy9hcGkvdjEvc3Rhci8nICsgeSArICcvJztcblxuICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwiZmEtc3Rhci1vXCIpKXtcbiAgICAgICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibm90LWxvZ2dlZC1pblwiKSl7XG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XG4gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xuICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuZmFkZUluKCk7XG4vLyAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlT3V0KCk7XG4gICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyLW9cIilcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LmFkZChcImZhLXN0YXJcIilcbiAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsICAgIC8vWW91ciBhcGkgdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnUFVUJywgICAvL3R5cGUgaXMgYW55IEhUVFAgbWV0aG9kXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sICAgICAgLy9EYXRhIGFzIGpzIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJmYS1zdGFyXCIpKXtcblxuICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyXCIpXG4gICAgICAgIHguY2xhc3NMaXN0LmFkZChcImZhLXN0YXItb1wiKVxuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgO1xuICAgIH1cblxufVxuXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG4gICQodGhpcykuY2xvc2VzdCgnLmNhcmQnKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlSW4oKTtcbn0pIiwiKGZ1bmN0aW9uKCQpe1widXNlIHN0cmljdFwiO3ZhciBNYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24oZWxlbWVudCxvcHRpb25zKXt2YXIgbXM9dGhpczt2YXIgZGVmYXVsdHM9e2FsbG93RnJlZUVudHJpZXM6dHJ1ZSxhbGxvd0R1cGxpY2F0ZXM6ZmFsc2UsYWpheENvbmZpZzp7fSxhdXRvU2VsZWN0OnRydWUsc2VsZWN0Rmlyc3Q6ZmFsc2UscXVlcnlQYXJhbTpcInF1ZXJ5XCIsYmVmb3JlU2VuZDpmdW5jdGlvbigpe30sY2xzOlwiXCIsZGF0YTpudWxsLGRhdGFVcmxQYXJhbXM6e30sZGlzYWJsZWQ6ZmFsc2UsZGlzYWJsZWRGaWVsZDpudWxsLGRpc3BsYXlGaWVsZDpcIm5hbWVcIixlZGl0YWJsZTp0cnVlLGV4cGFuZGVkOmZhbHNlLGV4cGFuZE9uRm9jdXM6ZmFsc2UsZ3JvdXBCeTpudWxsLGhpZGVUcmlnZ2VyOmZhbHNlLGhpZ2hsaWdodDp0cnVlLGlkOm51bGwsaW5mb01zZ0NsczpcIlwiLGlucHV0Q2ZnOnt9LGludmFsaWRDbHM6XCJtcy1pbnZcIixtYXRjaENhc2U6ZmFsc2UsbWF4RHJvcEhlaWdodDoyOTAsbWF4RW50cnlMZW5ndGg6bnVsbCxtYXhFbnRyeVJlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiUGxlYXNlIHJlZHVjZSB5b3VyIGVudHJ5IGJ5IFwiK3YrXCIgY2hhcmFjdGVyXCIrKHY+MT9cInNcIjpcIlwiKX0sbWF4U3VnZ2VzdGlvbnM6bnVsbCxtYXhTZWxlY3Rpb246MTAsbWF4U2VsZWN0aW9uUmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gXCIrditcIiBpdGVtXCIrKHY+MT9cInNcIjpcIlwiKX0sbWV0aG9kOlwiUE9TVFwiLG1pbkNoYXJzOjAsbWluQ2hhcnNSZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIlBsZWFzZSB0eXBlIFwiK3YrXCIgbW9yZSBjaGFyYWN0ZXJcIisodj4xP1wic1wiOlwiXCIpfSxtb2RlOlwibG9jYWxcIixuYW1lOm51bGwsbm9TdWdnZXN0aW9uVGV4dDpcIk5vIHN1Z2dlc3Rpb25zXCIscGxhY2Vob2xkZXI6XCJUeXBlIG9yIGNsaWNrIGhlcmVcIixyZW5kZXJlcjpudWxsLHJlcXVpcmVkOmZhbHNlLHJlc3VsdEFzU3RyaW5nOmZhbHNlLHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOlwiLFwiLHJlc3VsdHNGaWVsZDpcInJlc3VsdHNcIixzZWxlY3Rpb25DbHM6XCJcIixzZWxlY3Rpb25Db250YWluZXI6bnVsbCxzZWxlY3Rpb25Qb3NpdGlvbjpcImlubmVyXCIsc2VsZWN0aW9uUmVuZGVyZXI6bnVsbCxzZWxlY3Rpb25TdGFja2VkOmZhbHNlLHNvcnREaXI6XCJhc2NcIixzb3J0T3JkZXI6bnVsbCxzdHJpY3RTdWdnZXN0OmZhbHNlLHN0eWxlOlwiXCIsdG9nZ2xlT25DbGljazpmYWxzZSx0eXBlRGVsYXk6NDAwLHVzZVRhYktleTpmYWxzZSx1c2VDb21tYUtleTp0cnVlLHVzZVplYnJhU3R5bGU6ZmFsc2UsdmFsdWU6bnVsbCx2YWx1ZUZpZWxkOlwiaWRcIix2cmVnZXg6bnVsbCx2dHlwZTpudWxsfTt2YXIgY29uZj0kLmV4dGVuZCh7fSxvcHRpb25zKTt2YXIgY2ZnPSQuZXh0ZW5kKHRydWUse30sZGVmYXVsdHMsY29uZik7dGhpcy5hZGRUb1NlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyxpc1NpbGVudCl7aWYoIWNmZy5tYXhTZWxlY3Rpb258fF9zZWxlY3Rpb24ubGVuZ3RoPGNmZy5tYXhTZWxlY3Rpb24pe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe2lmKGNmZy5hbGxvd0R1cGxpY2F0ZXN8fCQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKT09PS0xKXtfc2VsZWN0aW9uLnB1c2goanNvbik7dmFsdWVjaGFuZ2VkPXRydWV9fSk7aWYodmFsdWVjaGFuZ2VkPT09dHJ1ZSl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7dGhpcy5lbXB0eSgpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfX19dGhpcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJnRoaXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcil9O3RoaXMuY2xlYXI9ZnVuY3Rpb24oaXNTaWxlbnQpe3RoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbihfc2VsZWN0aW9uLnNsaWNlKDApLGlzU2lsZW50KX07dGhpcy5jb2xsYXBzZT1mdW5jdGlvbigpe2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3RoaXMuY29tYm9ib3guZGV0YWNoKCk7Y2ZnLmV4cGFuZGVkPWZhbHNlOyQodGhpcykudHJpZ2dlcihcImNvbGxhcHNlXCIsW3RoaXNdKX19O3RoaXMuZGlzYWJsZT1mdW5jdGlvbigpe3RoaXMuY29udGFpbmVyLmFkZENsYXNzKFwibXMtY3RuLWRpc2FibGVkXCIpO2NmZy5kaXNhYmxlZD10cnVlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLHRydWUpfTt0aGlzLmVtcHR5PWZ1bmN0aW9uKCl7dGhpcy5pbnB1dC52YWwoXCJcIil9O3RoaXMuZW5hYmxlPWZ1bmN0aW9uKCl7dGhpcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZGlzYWJsZWRcIik7Y2ZnLmRpc2FibGVkPWZhbHNlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLGZhbHNlKX07dGhpcy5leHBhbmQ9ZnVuY3Rpb24oKXtpZighY2ZnLmV4cGFuZGVkJiYodGhpcy5pbnB1dC52YWwoKS5sZW5ndGg+PWNmZy5taW5DaGFyc3x8dGhpcy5jb21ib2JveC5jaGlsZHJlbigpLnNpemUoKT4wKSl7dGhpcy5jb21ib2JveC5hcHBlbmRUbyh0aGlzLmNvbnRhaW5lcik7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7Y2ZnLmV4cGFuZGVkPXRydWU7JCh0aGlzKS50cmlnZ2VyKFwiZXhwYW5kXCIsW3RoaXNdKX19O3RoaXMuaXNEaXNhYmxlZD1mdW5jdGlvbigpe3JldHVybiBjZmcuZGlzYWJsZWR9O3RoaXMuaXNWYWxpZD1mdW5jdGlvbigpe3ZhciB2YWxpZD1jZmcucmVxdWlyZWQ9PT1mYWxzZXx8X3NlbGVjdGlvbi5sZW5ndGg+MDtpZihjZmcudnR5cGV8fGNmZy52cmVnZXgpeyQuZWFjaChfc2VsZWN0aW9uLGZ1bmN0aW9uKGluZGV4LGl0ZW0pe3ZhbGlkPXZhbGlkJiZzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0oaXRlbVtjZmcudmFsdWVGaWVsZF0pfSl9cmV0dXJuIHZhbGlkfTt0aGlzLmdldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXN9O3RoaXMuZ2V0TmFtZT1mdW5jdGlvbigpe3JldHVybiBjZmcubmFtZX07dGhpcy5nZXRTZWxlY3Rpb249ZnVuY3Rpb24oKXtyZXR1cm4gX3NlbGVjdGlvbn07dGhpcy5nZXRSYXdWYWx1ZT1mdW5jdGlvbigpe3JldHVybiBtcy5pbnB1dC52YWwoKX07dGhpcy5nZXRWYWx1ZT1mdW5jdGlvbigpe3JldHVybiAkLm1hcChfc2VsZWN0aW9uLGZ1bmN0aW9uKG8pe3JldHVybiBvW2NmZy52YWx1ZUZpZWxkXX0pfTt0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMsaXNTaWxlbnQpe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe3ZhciBpPSQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKTtpZihpPi0xKXtfc2VsZWN0aW9uLnNwbGljZShpLDEpO3ZhbHVlY2hhbmdlZD10cnVlfX0pO2lmKHZhbHVlY2hhbmdlZD09PXRydWUpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfWlmKGNmZy5leHBhbmRPbkZvY3VzKXttcy5leHBhbmQoKX1pZihjZmcuZXhwYW5kZWQpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfX10aGlzLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKX07dGhpcy5nZXREYXRhPWZ1bmN0aW9uKCl7cmV0dXJuIF9jYkRhdGF9O3RoaXMuc2V0RGF0YT1mdW5jdGlvbihkYXRhKXtjZmcuZGF0YT1kYXRhO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfTt0aGlzLnNldE5hbWU9ZnVuY3Rpb24obmFtZSl7Y2ZnLm5hbWU9bmFtZTtpZihuYW1lKXtjZmcubmFtZSs9bmFtZS5pbmRleE9mKFwiW11cIik+MD9cIlwiOlwiW11cIn1pZihtcy5fdmFsdWVDb250YWluZXIpeyQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSxmdW5jdGlvbihpLGVsKXtlbC5uYW1lPWNmZy5uYW1lfSl9fTt0aGlzLnNldFNlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyl7dGhpcy5jbGVhcigpO3RoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpfTt0aGlzLnNldFZhbHVlPWZ1bmN0aW9uKHZhbHVlcyl7dmFyIGl0ZW1zPVtdOyQuZWFjaCh2YWx1ZXMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBmb3VuZD1mYWxzZTskLmVhY2goX2NiRGF0YSxmdW5jdGlvbihpLGl0ZW0pe2lmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdPT12YWx1ZSl7aXRlbXMucHVzaChpdGVtKTtmb3VuZD10cnVlO3JldHVybiBmYWxzZX19KTtpZighZm91bmQpe2lmKHR5cGVvZiB2YWx1ZT09PVwib2JqZWN0XCIpe2l0ZW1zLnB1c2godmFsdWUpfWVsc2V7dmFyIGpzb249e307anNvbltjZmcudmFsdWVGaWVsZF09dmFsdWU7anNvbltjZmcuZGlzcGxheUZpZWxkXT12YWx1ZTtpdGVtcy5wdXNoKGpzb24pfX19KTtpZihpdGVtcy5sZW5ndGg+MCl7dGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyl9fTt0aGlzLnNldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24ocGFyYW1zKXtjZmcuZGF0YVVybFBhcmFtcz0kLmV4dGVuZCh7fSxwYXJhbXMpfTt2YXIgX3NlbGVjdGlvbj1bXSxfY29tYm9JdGVtSGVpZ2h0PTAsX3RpbWVyLF9oYXNGb2N1cz1mYWxzZSxfZ3JvdXBzPW51bGwsX2NiRGF0YT1bXSxfY3RybERvd249ZmFsc2UsS0VZQ09ERVM9e0JBQ0tTUEFDRTo4LFRBQjo5LEVOVEVSOjEzLENUUkw6MTcsRVNDOjI3LFNQQUNFOjMyLFVQQVJST1c6MzgsRE9XTkFSUk9XOjQwLENPTU1BOjE4OH07dmFyIHNlbGY9e19kaXNwbGF5U3VnZ2VzdGlvbnM6ZnVuY3Rpb24oZGF0YSl7bXMuY29tYm9ib3guc2hvdygpO21zLmNvbWJvYm94LmVtcHR5KCk7dmFyIHJlc0hlaWdodD0wLG5iR3JvdXBzPTA7aWYoX2dyb3Vwcz09PW51bGwpe3NlbGYuX3JlbmRlckNvbWJvSXRlbXMoZGF0YSk7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqZGF0YS5sZW5ndGh9ZWxzZXtmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcyl7bmJHcm91cHMrPTE7JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtZ3JvdXBcIixodG1sOmdycE5hbWV9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7c2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhfZ3JvdXBzW2dycE5hbWVdLml0ZW1zLHRydWUpfXZhciBfZ3JvdXBJdGVtSGVpZ2h0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWdyb3VwXCIpLm91dGVySGVpZ2h0KCk7aWYoX2dyb3VwSXRlbUhlaWdodCE9PW51bGwpe3ZhciB0bXBSZXNIZWlnaHQ9bmJHcm91cHMqX2dyb3VwSXRlbUhlaWdodDtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCpkYXRhLmxlbmd0aCt0bXBSZXNIZWlnaHR9ZWxzZXtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCooZGF0YS5sZW5ndGgrbmJHcm91cHMpfX1pZihyZXNIZWlnaHQ8bXMuY29tYm9ib3guaGVpZ2h0KCl8fHJlc0hlaWdodDw9Y2ZnLm1heERyb3BIZWlnaHQpe21zLmNvbWJvYm94LmhlaWdodChyZXNIZWlnaHQpfWVsc2UgaWYocmVzSGVpZ2h0Pj1tcy5jb21ib2JveC5oZWlnaHQoKSYmcmVzSGVpZ2h0PmNmZy5tYXhEcm9wSGVpZ2h0KXttcy5jb21ib2JveC5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpfWlmKGRhdGEubGVuZ3RoPT09MSYmY2ZnLmF1dG9TZWxlY3Q9PT10cnVlKXttcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcihcIjpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGNmZy5zZWxlY3RGaXJzdD09PXRydWUpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKFwiOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGRhdGEubGVuZ3RoPT09MCYmbXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCIpe3ZhciBub1N1Z2dlc3Rpb25UZXh0PWNmZy5ub1N1Z2dlc3Rpb25UZXh0LnJlcGxhY2UoL1xce1xcey4qXFx9XFx9Lyxtcy5pbnB1dC52YWwoKSk7c2VsZi5fdXBkYXRlSGVscGVyKG5vU3VnZ2VzdGlvblRleHQpO21zLmNvbGxhcHNlKCl9aWYoY2ZnLmFsbG93RnJlZUVudHJpZXM9PT1mYWxzZSl7aWYoZGF0YS5sZW5ndGg9PT0wKXskKG1zLmlucHV0KS5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7bXMuY29tYm9ib3guaGlkZSgpfWVsc2V7JChtcy5pbnB1dCkucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpfX19LF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OmZ1bmN0aW9uKGRhdGEpe3ZhciBqc29uPVtdOyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LHMpe3ZhciBlbnRyeT17fTtlbnRyeVtjZmcuZGlzcGxheUZpZWxkXT1lbnRyeVtjZmcudmFsdWVGaWVsZF09JC50cmltKHMpO2pzb24ucHVzaChlbnRyeSl9KTtyZXR1cm4ganNvbn0sX2hpZ2hsaWdodFN1Z2dlc3Rpb246ZnVuY3Rpb24oaHRtbCl7dmFyIHE9bXMuaW5wdXQudmFsKCk7dmFyIHNwZWNpYWxDaGFyYWN0ZXJzPVtcIl5cIixcIiRcIixcIipcIixcIitcIixcIj9cIixcIi5cIixcIihcIixcIilcIixcIjpcIixcIiFcIixcInxcIixcIntcIixcIn1cIixcIltcIixcIl1cIl07JC5lYWNoKHNwZWNpYWxDaGFyYWN0ZXJzLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXtxPXEucmVwbGFjZSh2YWx1ZSxcIlxcXFxcIit2YWx1ZSl9KTtpZihxLmxlbmd0aD09PTApe3JldHVybiBodG1sfXZhciBnbG9iPWNmZy5tYXRjaENhc2U9PT10cnVlP1wiZ1wiOlwiZ2lcIjtyZXR1cm4gaHRtbC5yZXBsYWNlKG5ldyBSZWdFeHAoXCIoXCIrcStcIikoPyEoW148XSspPz4pXCIsZ2xvYiksXCI8ZW0+JDE8L2VtPlwiKX0sX21vdmVTZWxlY3RlZFJvdzpmdW5jdGlvbihkaXIpe2lmKCFjZmcuZXhwYW5kZWQpe21zLmV4cGFuZCgpfXZhciBsaXN0LHN0YXJ0LGFjdGl2ZSxzY3JvbGxQb3M7bGlzdD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpO2lmKGRpcj09PVwiZG93blwiKXtzdGFydD1saXN0LmVxKDApfWVsc2V7c3RhcnQ9bGlzdC5maWx0ZXIoXCI6bGFzdFwiKX1hY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIik7aWYoYWN0aXZlLmxlbmd0aD4wKXtpZihkaXI9PT1cImRvd25cIil7c3RhcnQ9YWN0aXZlLm5leHRBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmVxKDApfXNjcm9sbFBvcz1tcy5jb21ib2JveC5zY3JvbGxUb3AoKTttcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7aWYoc3RhcnRbMF0ub2Zmc2V0VG9wK3N0YXJ0Lm91dGVySGVpZ2h0KCk+bXMuY29tYm9ib3guaGVpZ2h0KCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChzY3JvbGxQb3MrX2NvbWJvSXRlbUhlaWdodCl9fWVsc2V7c3RhcnQ9YWN0aXZlLnByZXZBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmZpbHRlcihcIjpsYXN0XCIpO21zLmNvbWJvYm94LnNjcm9sbFRvcChfY29tYm9JdGVtSGVpZ2h0Kmxpc3QubGVuZ3RoKX1pZihzdGFydFswXS5vZmZzZXRUb3A8bXMuY29tYm9ib3guc2Nyb2xsVG9wKCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChtcy5jb21ib2JveC5zY3JvbGxUb3AoKS1fY29tYm9JdGVtSGVpZ2h0KX19fWxpc3QucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7c3RhcnQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9LF9wcm9jZXNzU3VnZ2VzdGlvbnM6ZnVuY3Rpb24oc291cmNlKXt2YXIganNvbj1udWxsLGRhdGE9c291cmNlfHxjZmcuZGF0YTtpZihkYXRhIT09bnVsbCl7aWYodHlwZW9mIGRhdGE9PT1cImZ1bmN0aW9uXCIpe2RhdGE9ZGF0YS5jYWxsKG1zLG1zLmdldFJhd1ZhbHVlKCkpfWlmKHR5cGVvZiBkYXRhPT09XCJzdHJpbmdcIil7JChtcykudHJpZ2dlcihcImJlZm9yZWxvYWRcIixbbXNdKTt2YXIgcXVlcnlQYXJhbXM9e307cXVlcnlQYXJhbXNbY2ZnLnF1ZXJ5UGFyYW1dPW1zLmlucHV0LnZhbCgpO3ZhciBwYXJhbXM9JC5leHRlbmQocXVlcnlQYXJhbXMsY2ZnLmRhdGFVcmxQYXJhbXMpOyQuYWpheCgkLmV4dGVuZCh7dHlwZTpjZmcubWV0aG9kLHVybDpkYXRhLGRhdGE6cGFyYW1zLGJlZm9yZVNlbmQ6Y2ZnLmJlZm9yZVNlbmQsc3VjY2VzczpmdW5jdGlvbihhc3luY0RhdGEpe2pzb249dHlwZW9mIGFzeW5jRGF0YT09PVwic3RyaW5nXCI/SlNPTi5wYXJzZShhc3luY0RhdGEpOmFzeW5jRGF0YTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoanNvbik7JChtcykudHJpZ2dlcihcImxvYWRcIixbbXMsanNvbl0pO2lmKHNlbGYuX2FzeW5jVmFsdWVzKXttcy5zZXRWYWx1ZSh0eXBlb2Ygc2VsZi5fYXN5bmNWYWx1ZXM9PT1cInN0cmluZ1wiP0pTT04ucGFyc2Uoc2VsZi5fYXN5bmNWYWx1ZXMpOnNlbGYuX2FzeW5jVmFsdWVzKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtkZWxldGUgc2VsZi5fYXN5bmNWYWx1ZXN9fSxlcnJvcjpmdW5jdGlvbigpe3Rocm93XCJDb3VsZCBub3QgcmVhY2ggc2VydmVyXCJ9fSxjZmcuYWpheENvbmZpZykpO3JldHVybn1lbHNle2lmKGRhdGEubGVuZ3RoPjAmJnR5cGVvZiBkYXRhWzBdPT09XCJzdHJpbmdcIil7X2NiRGF0YT1zZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpfWVsc2V7X2NiRGF0YT1kYXRhW2NmZy5yZXN1bHRzRmllbGRdfHxkYXRhfX12YXIgc29ydGVkRGF0YT1jZmcubW9kZT09PVwicmVtb3RlXCI/X2NiRGF0YTpzZWxmLl9zb3J0QW5kVHJpbShfY2JEYXRhKTtzZWxmLl9kaXNwbGF5U3VnZ2VzdGlvbnMoc2VsZi5fZ3JvdXAoc29ydGVkRGF0YSkpfX0sX3JlbmRlcjpmdW5jdGlvbihlbCl7bXMuc2V0TmFtZShjZmcubmFtZSk7bXMuY29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtY3RuIGZvcm0tY29udHJvbCBcIisoY2ZnLnJlc3VsdEFzU3RyaW5nP1wibXMtYXMtc3RyaW5nIFwiOlwiXCIpK2NmZy5jbHMrKCQoZWwpLmhhc0NsYXNzKFwiaW5wdXQtbGdcIik/XCIgaW5wdXQtbGdcIjpcIlwiKSsoJChlbCkuaGFzQ2xhc3MoXCJpbnB1dC1zbVwiKT9cIiBpbnB1dC1zbVwiOlwiXCIpKyhjZmcuZGlzYWJsZWQ9PT10cnVlP1wiIG1zLWN0bi1kaXNhYmxlZFwiOlwiXCIpKyhjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtY3RuLXJlYWRvbmx5XCIpKyhjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZT9cIlwiOlwiIG1zLW5vLXRyaWdnZXJcIiksc3R5bGU6Y2ZnLnN0eWxlLGlkOmNmZy5pZH0pO21zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLHRoaXMpKTttcy5jb250YWluZXIuYmx1cigkLnByb3h5KGhhbmRsZXJzLl9vbkJsdXIsdGhpcykpO21zLmNvbnRhaW5lci5rZXlkb3duKCQucHJveHkoaGFuZGxlcnMuX29uS2V5RG93bix0aGlzKSk7bXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsdGhpcykpO21zLmlucHV0PSQoXCI8aW5wdXQvPlwiLCQuZXh0ZW5kKHt0eXBlOlwidGV4dFwiLFwiY2xhc3NcIjpjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtaW5wdXQtcmVhZG9ubHlcIixyZWFkb25seTohY2ZnLmVkaXRhYmxlLHBsYWNlaG9sZGVyOmNmZy5wbGFjZWhvbGRlcixkaXNhYmxlZDpjZmcuZGlzYWJsZWR9LGNmZy5pbnB1dENmZykpO21zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cyx0aGlzKSk7bXMuaW5wdXQuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25JbnB1dENsaWNrLHRoaXMpKTttcy5jb21ib2JveD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1jdG4gZHJvcGRvd24tbWVudVwifSkuaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTttcy5jb21ib2JveC5vbihcImNsaWNrXCIsXCJkaXYubXMtcmVzLWl0ZW1cIiwkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbVNlbGVjdGVkLHRoaXMpKTttcy5jb21ib2JveC5vbihcIm1vdXNlb3ZlclwiLFwiZGl2Lm1zLXJlcy1pdGVtXCIsJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1Nb3VzZU92ZXIsdGhpcykpO2lmKGNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLnNlbGVjdGlvbkNvbnRhaW5lcj1jZmcuc2VsZWN0aW9uQ29udGFpbmVyOyQobXMuc2VsZWN0aW9uQ29udGFpbmVyKS5hZGRDbGFzcyhcIm1zLXNlbC1jdG5cIil9ZWxzZXttcy5zZWxlY3Rpb25Db250YWluZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtY3RuXCJ9KX1tcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cyx0aGlzKSk7aWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiYhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCl9ZWxzZXttcy5jb250YWluZXIuYXBwZW5kKG1zLmlucHV0KX1tcy5oZWxwZXI9JChcIjxzcGFuLz5cIix7XCJjbGFzc1wiOlwibXMtaGVscGVyIFwiK2NmZy5pbmZvTXNnQ2xzfSk7c2VsZi5fdXBkYXRlSGVscGVyKCk7bXMuY29udGFpbmVyLmFwcGVuZChtcy5oZWxwZXIpOyQoZWwpLnJlcGxhY2VXaXRoKG1zLmNvbnRhaW5lcik7aWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe3N3aXRjaChjZmcuc2VsZWN0aW9uUG9zaXRpb24pe2Nhc2VcImJvdHRvbVwiOm1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25TdGFja2VkPT09dHJ1ZSl7bXMuc2VsZWN0aW9uQ29udGFpbmVyLndpZHRoKG1zLmNvbnRhaW5lci53aWR0aCgpKTttcy5zZWxlY3Rpb25Db250YWluZXIuYWRkQ2xhc3MoXCJtcy1zdGFja2VkXCIpfWJyZWFrO2Nhc2VcInJpZ2h0XCI6bXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7bXMuY29udGFpbmVyLmNzcyhcImZsb2F0XCIsXCJsZWZ0XCIpO2JyZWFrO2RlZmF1bHQ6bXMuY29udGFpbmVyLmFwcGVuZChtcy5zZWxlY3Rpb25Db250YWluZXIpO2JyZWFrfX1pZihjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZSl7bXMudHJpZ2dlcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXRyaWdnZXJcIixodG1sOic8ZGl2IGNsYXNzPVwibXMtdHJpZ2dlci1pY29cIj48L2Rpdj4nfSk7bXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljayx0aGlzKSk7bXMuY29udGFpbmVyLmFwcGVuZChtcy50cmlnZ2VyKX0kKHdpbmRvdykucmVzaXplKCQucHJveHkoaGFuZGxlcnMuX29uV2luZG93UmVzaXplZCx0aGlzKSk7aWYoY2ZnLnZhbHVlIT09bnVsbHx8Y2ZnLmRhdGEhPT1udWxsKXtpZih0eXBlb2YgY2ZnLmRhdGE9PT1cInN0cmluZ1wiKXtzZWxmLl9hc3luY1ZhbHVlcz1jZmcudmFsdWU7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihjZmcudmFsdWUhPT1udWxsKXttcy5zZXRWYWx1ZShjZmcudmFsdWUpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpfX19JChcImJvZHlcIikuY2xpY2soZnVuY3Rpb24oZSl7aWYobXMuY29udGFpbmVyLmhhc0NsYXNzKFwibXMtY3RuLWZvY3VzXCIpJiZtcy5jb250YWluZXIuaGFzKGUudGFyZ2V0KS5sZW5ndGg9PT0wJiZlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZihcIm1zLXJlcy1pdGVtXCIpPDAmJmUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKFwibXMtY2xvc2UtYnRuXCIpPDAmJm1zLmNvbnRhaW5lclswXSE9PWUudGFyZ2V0KXtoYW5kbGVycy5fb25CbHVyKCl9fSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7Y2ZnLmV4cGFuZGVkPWZhbHNlO21zLmV4cGFuZCgpfX0sX3JlbmRlckNvbWJvSXRlbXM6ZnVuY3Rpb24oaXRlbXMsaXNHcm91cGVkKXt2YXIgcmVmPXRoaXMsaHRtbD1cIlwiOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIGRpc3BsYXllZD1jZmcucmVuZGVyZXIhPT1udWxsP2NmZy5yZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIGRpc2FibGVkPWNmZy5kaXNhYmxlZEZpZWxkIT09bnVsbCYmdmFsdWVbY2ZnLmRpc2FibGVkRmllbGRdPT09dHJ1ZTt2YXIgcmVzdWx0SXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWl0ZW0gXCIrKGlzR3JvdXBlZD9cIm1zLXJlcy1pdGVtLWdyb3VwZWQgXCI6XCJcIikrKGRpc2FibGVkP1wibXMtcmVzLWl0ZW0tZGlzYWJsZWQgXCI6XCJcIikrKGluZGV4JTI9PT0xJiZjZmcudXNlWmVicmFTdHlsZT09PXRydWU/XCJtcy1yZXMtb2RkXCI6XCJcIiksaHRtbDpjZmcuaGlnaGxpZ2h0PT09dHJ1ZT9zZWxmLl9oaWdobGlnaHRTdWdnZXN0aW9uKGRpc3BsYXllZCk6ZGlzcGxheWVkLFwiZGF0YS1qc29uXCI6SlNPTi5zdHJpbmdpZnkodmFsdWUpfSk7aHRtbCs9JChcIjxkaXYvPlwiKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCl9KTttcy5jb21ib2JveC5hcHBlbmQoaHRtbCk7X2NvbWJvSXRlbUhlaWdodD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOmZpcnN0XCIpLm91dGVySGVpZ2h0KCl9LF9yZW5kZXJTZWxlY3Rpb246ZnVuY3Rpb24oKXt2YXIgcmVmPXRoaXMsdz0wLGlucHV0T2Zmc2V0PTAsaXRlbXM9W10sYXNUZXh0PWNmZy5yZXN1bHRBc1N0cmluZz09PXRydWUmJiFfaGFzRm9jdXM7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmZpbmQoXCIubXMtc2VsLWl0ZW1cIikucmVtb3ZlKCk7aWYobXMuX3ZhbHVlQ29udGFpbmVyIT09dW5kZWZpbmVkKXttcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCl9JC5lYWNoKF9zZWxlY3Rpb24sZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBzZWxlY3RlZEl0ZW1FbCxkZWxJdGVtRWwsc2VsZWN0ZWRJdGVtSHRtbD1jZmcuc2VsZWN0aW9uUmVuZGVyZXIhPT1udWxsP2NmZy5zZWxlY3Rpb25SZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIHZhbGlkQ2xzPXNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbSh2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXSk/XCJcIjpcIiBtcy1zZWwtaW52YWxpZFwiO2lmKGFzVGV4dD09PXRydWUpe3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gbXMtc2VsLXRleHQgXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWwrKGluZGV4PT09X3NlbGVjdGlvbi5sZW5ndGgtMT9cIlwiOmNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcil9KS5kYXRhKFwianNvblwiLHZhbHVlKX1lbHNle3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWx9KS5kYXRhKFwianNvblwiLHZhbHVlKTtpZihjZmcuZGlzYWJsZWQ9PT1mYWxzZSl7ZGVsSXRlbUVsPSQoXCI8c3Bhbi8+XCIse1wiY2xhc3NcIjpcIm1zLWNsb3NlLWJ0blwifSkuZGF0YShcImpzb25cIix2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO2RlbEl0ZW1FbC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRhZ1RyaWdnZXJDbGljayxyZWYpKX19aXRlbXMucHVzaChzZWxlY3RlZEl0ZW1FbCl9KTttcy5zZWxlY3Rpb25Db250YWluZXIucHJlcGVuZChpdGVtcyk7bXMuX3ZhbHVlQ29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7c3R5bGU6XCJkaXNwbGF5OiBub25lO1wifSk7JC5lYWNoKG1zLmdldFZhbHVlKCksZnVuY3Rpb24oaSx2YWwpe3ZhciBlbD0kKFwiPGlucHV0Lz5cIix7dHlwZTpcImhpZGRlblwiLG5hbWU6Y2ZnLm5hbWUsdmFsdWU6dmFsfSk7ZWwuYXBwZW5kVG8obXMuX3ZhbHVlQ29udGFpbmVyKX0pO21zLl92YWx1ZUNvbnRhaW5lci5hcHBlbmRUbyhtcy5zZWxlY3Rpb25Db250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLmlucHV0LndpZHRoKDApO2lucHV0T2Zmc2V0PW1zLmlucHV0Lm9mZnNldCgpLmxlZnQtbXMuc2VsZWN0aW9uQ29udGFpbmVyLm9mZnNldCgpLmxlZnQ7dz1tcy5jb250YWluZXIud2lkdGgoKS1pbnB1dE9mZnNldC00Mjttcy5pbnB1dC53aWR0aCh3KX1pZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXttcy5oZWxwZXIuaGlkZSgpfX0sX3NlbGVjdEl0ZW06ZnVuY3Rpb24oaXRlbSl7aWYoY2ZnLm1heFNlbGVjdGlvbj09PTEpe19zZWxlY3Rpb249W119bXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKFwianNvblwiKSk7aXRlbS5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtpZihjZmcuZXhwYW5kT25Gb2N1cz09PWZhbHNlfHxfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe21zLmNvbGxhcHNlKCl9aWYoIV9oYXNGb2N1cyl7bXMuaW5wdXQuZm9jdXMoKX1lbHNlIGlmKF9oYXNGb2N1cyYmKGNmZy5leHBhbmRPbkZvY3VzfHxfY3RybERvd24pKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihfY3RybERvd24pe21zLmV4cGFuZCgpfX19LF9zb3J0QW5kVHJpbTpmdW5jdGlvbihkYXRhKXt2YXIgcT1tcy5nZXRSYXdWYWx1ZSgpLGZpbHRlcmVkPVtdLG5ld1N1Z2dlc3Rpb25zPVtdLHNlbGVjdGVkVmFsdWVzPW1zLmdldFZhbHVlKCk7aWYocS5sZW5ndGg+MCl7JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgsb2JqKXt2YXIgbmFtZT1vYmpbY2ZnLmRpc3BsYXlGaWVsZF07aWYoY2ZnLm1hdGNoQ2FzZT09PXRydWUmJm5hbWUuaW5kZXhPZihxKT4tMXx8Y2ZnLm1hdGNoQ2FzZT09PWZhbHNlJiZuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPi0xKXtpZihjZmcuc3RyaWN0U3VnZ2VzdD09PWZhbHNlfHxuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPT09MCl7ZmlsdGVyZWQucHVzaChvYmopfX19KX1lbHNle2ZpbHRlcmVkPWRhdGF9JC5lYWNoKGZpbHRlcmVkLGZ1bmN0aW9uKGluZGV4LG9iail7aWYoY2ZnLmFsbG93RHVwbGljYXRlc3x8JC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sc2VsZWN0ZWRWYWx1ZXMpPT09LTEpe25ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKX19KTtpZihjZmcuc29ydE9yZGVyIT09bnVsbCl7bmV3U3VnZ2VzdGlvbnMuc29ydChmdW5jdGlvbihhLGIpe2lmKGFbY2ZnLnNvcnRPcmRlcl08YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8tMToxfWlmKGFbY2ZnLnNvcnRPcmRlcl0+YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8xOi0xfXJldHVybiAwfSl9aWYoY2ZnLm1heFN1Z2dlc3Rpb25zJiZjZmcubWF4U3VnZ2VzdGlvbnM+MCl7bmV3U3VnZ2VzdGlvbnM9bmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCxjZmcubWF4U3VnZ2VzdGlvbnMpfXJldHVybiBuZXdTdWdnZXN0aW9uc30sX2dyb3VwOmZ1bmN0aW9uKGRhdGEpe2lmKGNmZy5ncm91cEJ5IT09bnVsbCl7X2dyb3Vwcz17fTskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIHByb3BzPWNmZy5ncm91cEJ5LmluZGV4T2YoXCIuXCIpPi0xP2NmZy5ncm91cEJ5LnNwbGl0KFwiLlwiKTpjZmcuZ3JvdXBCeTt2YXIgcHJvcD12YWx1ZVtjZmcuZ3JvdXBCeV07aWYodHlwZW9mIHByb3BzIT1cInN0cmluZ1wiKXtwcm9wPXZhbHVlO3doaWxlKHByb3BzLmxlbmd0aD4wKXtwcm9wPXByb3BbcHJvcHMuc2hpZnQoKV19fWlmKF9ncm91cHNbcHJvcF09PT11bmRlZmluZWQpe19ncm91cHNbcHJvcF09e3RpdGxlOnByb3AsaXRlbXM6W3ZhbHVlXX19ZWxzZXtfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpfX0pfXJldHVybiBkYXRhfSxfdXBkYXRlSGVscGVyOmZ1bmN0aW9uKGh0bWwpe21zLmhlbHBlci5odG1sKGh0bWwpO2lmKCFtcy5oZWxwZXIuaXMoXCI6dmlzaWJsZVwiKSl7bXMuaGVscGVyLmZhZGVJbigpfX0sX3ZhbGlkYXRlU2luZ2xlSXRlbTpmdW5jdGlvbih2YWx1ZSl7aWYoY2ZnLnZyZWdleCE9PW51bGwmJmNmZy52cmVnZXggaW5zdGFuY2VvZiBSZWdFeHApe3JldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpfWVsc2UgaWYoY2ZnLnZ0eXBlIT09bnVsbCl7c3dpdGNoKGNmZy52dHlwZSl7Y2FzZVwiYWxwaGFcIjpyZXR1cm4vXlthLXpBLVpfXSskLy50ZXN0KHZhbHVlKTtjYXNlXCJhbHBoYW51bVwiOnJldHVybi9eW2EtekEtWjAtOV9dKyQvLnRlc3QodmFsdWUpO2Nhc2VcImVtYWlsXCI6cmV0dXJuL14oXFx3KykoW1xcLSsuXVtcXHddKykqQChcXHdbXFwtXFx3XSpcXC4pezEsNX0oW0EtWmEtel0pezIsNn0kLy50ZXN0KHZhbHVlKTtjYXNlXCJ1cmxcIjpyZXR1cm4vKCgoXmh0dHBzPyl8KF5mdHApKTpcXC9cXC8oW1xcLVxcd10rXFwuKStcXHd7MiwzfShcXC9bJVxcLVxcd10rKFxcLlxcd3syLH0pPykqKChbXFx3XFwtXFwuXFw/XFxcXFxcLytAJiM7YH49JSFdKikoXFwuXFx3ezIsfSk/KSpcXC8/KS9pLnRlc3QodmFsdWUpO2Nhc2VcImlwYWRkcmVzc1wiOnJldHVybi9eXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30kLy50ZXN0KHZhbHVlKX19cmV0dXJuIHRydWV9fTt2YXIgaGFuZGxlcnM9e19vbkJsdXI6ZnVuY3Rpb24oKXttcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29sbGFwc2UoKTtfaGFzRm9jdXM9ZmFsc2U7aWYobXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCImJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09dHJ1ZSl7dmFyIG9iaj17fTtvYmpbY2ZnLmRpc3BsYXlGaWVsZF09b2JqW2NmZy52YWx1ZUZpZWxkXT1tcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTttcy5hZGRUb1NlbGVjdGlvbihvYmopfXNlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKG1zLmlzVmFsaWQoKT09PWZhbHNlKXttcy5jb250YWluZXIuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpfWVsc2UgaWYobXMuaW5wdXQudmFsKCkhPT1cIlwiJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PWZhbHNlKXttcy5lbXB0eSgpO3NlbGYuX3VwZGF0ZUhlbHBlcihcIlwiKX0kKG1zKS50cmlnZ2VyKFwiYmx1clwiLFttc10pfSxfb25Db21ib0l0ZW1Nb3VzZU92ZXI6ZnVuY3Rpb24oZSl7dmFyIHRhcmdldD0kKGUuY3VycmVudFRhcmdldCk7aWYoIXRhcmdldC5oYXNDbGFzcyhcIm1zLXJlcy1pdGVtLWRpc2FibGVkXCIpKXttcy5jb21ib2JveC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO3RhcmdldC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX19LF9vbkNvbWJvSXRlbVNlbGVjdGVkOmZ1bmN0aW9uKGUpe3ZhciB0YXJnZXQ9JChlLmN1cnJlbnRUYXJnZXQpO2lmKCF0YXJnZXQuaGFzQ2xhc3MoXCJtcy1yZXMtaXRlbS1kaXNhYmxlZFwiKSl7c2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpfX0sX29uRm9jdXM6ZnVuY3Rpb24oKXttcy5pbnB1dC5mb2N1cygpfSxfb25JbnB1dENsaWNrOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJl9oYXNGb2N1cyl7aWYoY2ZnLnRvZ2dsZU9uQ2xpY2s9PT10cnVlKXtpZihjZmcuZXhwYW5kZWQpe21zLmNvbGxhcHNlKCl9ZWxzZXttcy5leHBhbmQoKX19fX0sX29uSW5wdXRGb2N1czpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiYhX2hhc0ZvY3VzKXtfaGFzRm9jdXM9dHJ1ZTttcy5jb250YWluZXIuYWRkQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTt2YXIgY3VyTGVuZ3RoPW1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO2lmKGNmZy5leHBhbmRPbkZvY3VzPT09dHJ1ZSl7bXMuZXhwYW5kKCl9aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2UgaWYoY3VyTGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtY3VyTGVuZ3RoKSl9c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcImZvY3VzXCIsW21zXSl9fSxfb25LZXlEb3duOmZ1bmN0aW9uKGUpe3ZhciBhY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIiksZnJlZUlucHV0PW1zLmlucHV0LnZhbCgpOyQobXMpLnRyaWdnZXIoXCJrZXlkb3duXCIsW21zLGVdKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5UQUImJihjZmcudXNlVGFiS2V5PT09ZmFsc2V8fGNmZy51c2VUYWJLZXk9PT10cnVlJiZhY3RpdmUubGVuZ3RoPT09MCYmbXMuaW5wdXQudmFsKCkubGVuZ3RoPT09MCkpe2hhbmRsZXJzLl9vbkJsdXIoKTtyZXR1cm59c3dpdGNoKGUua2V5Q29kZSl7Y2FzZSBLRVlDT0RFUy5CQUNLU1BBQ0U6aWYoZnJlZUlucHV0Lmxlbmd0aD09PTAmJm1zLmdldFNlbGVjdGlvbigpLmxlbmd0aD4wJiZjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCIpe19zZWxlY3Rpb24ucG9wKCk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFttcyxtcy5nZXRTZWxlY3Rpb24oKV0pO21zLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmbXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcik7bXMuaW5wdXQuZm9jdXMoKTtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5FU0M6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6aWYoZnJlZUlucHV0IT09XCJcInx8Y2ZnLmV4cGFuZGVkKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DT01NQTppZihjZmcudXNlQ29tbWFLZXk9PT10cnVlKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DVFJMOl9jdHJsRG93bj10cnVlO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOmUucHJldmVudERlZmF1bHQoKTtzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJkb3duXCIpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuVVBBUlJPVzplLnByZXZlbnREZWZhdWx0KCk7c2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7YnJlYWs7ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe2UucHJldmVudERlZmF1bHQoKX1icmVha319LF9vbktleVVwOmZ1bmN0aW9uKGUpe3ZhciBmcmVlSW5wdXQ9bXMuZ2V0UmF3VmFsdWUoKSxpbnB1dFZhbGlkPSQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoPjAmJighY2ZnLm1heEVudHJ5TGVuZ3RofHwkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aDw9Y2ZnLm1heEVudHJ5TGVuZ3RoKSxzZWxlY3RlZCxvYmo9e307JChtcykudHJpZ2dlcihcImtleXVwXCIsW21zLGVdKTtjbGVhclRpbWVvdXQoX3RpbWVyKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5FU0MmJmNmZy5leHBhbmRlZCl7bXMuY29tYm9ib3guaGlkZSgpfWlmKGUua2V5Q29kZT09PUtFWUNPREVTLlRBQiYmY2ZnLnVzZVRhYktleT09PWZhbHNlfHxlLmtleUNvZGU+S0VZQ09ERVMuRU5URVImJmUua2V5Q29kZTxLRVlDT0RFUy5TUEFDRSl7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuQ1RSTCl7X2N0cmxEb3duPWZhbHNlfXJldHVybn1zd2l0Y2goZS5rZXlDb2RlKXtjYXNlIEtFWUNPREVTLlVQQVJST1c6Y2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5DT01NQTppZihlLmtleUNvZGUhPT1LRVlDT0RFUy5DT01NQXx8Y2ZnLnVzZUNvbW1hS2V5PT09dHJ1ZSl7ZS5wcmV2ZW50RGVmYXVsdCgpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3NlbGVjdGVkPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpO2lmKHNlbGVjdGVkLmxlbmd0aD4wKXtzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtyZXR1cm59fWlmKGlucHV0VmFsaWQ9PT10cnVlJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PXRydWUpe29ialtjZmcuZGlzcGxheUZpZWxkXT1vYmpbY2ZnLnZhbHVlRmllbGRdPWZyZWVJbnB1dC50cmltKCk7bXMuYWRkVG9TZWxlY3Rpb24ob2JqKTttcy5jb2xsYXBzZSgpO21zLmlucHV0LmZvY3VzKCl9YnJlYWt9ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXtpZihmcmVlSW5wdXQubGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtZnJlZUlucHV0Lmxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2UgaWYoY2ZnLm1heEVudHJ5TGVuZ3RoJiZmcmVlSW5wdXQubGVuZ3RoPmNmZy5tYXhFbnRyeUxlbmd0aCl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhFbnRyeVJlbmRlcmVyLmNhbGwodGhpcyxmcmVlSW5wdXQubGVuZ3RoLWNmZy5tYXhFbnRyeUxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2V7bXMuaGVscGVyLmhpZGUoKTtpZihjZmcubWluQ2hhcnM8PWZyZWVJbnB1dC5sZW5ndGgpe190aW1lcj1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXttcy5leHBhbmQoKX19LGNmZy50eXBlRGVsYXkpfX19YnJlYWt9fSxfb25UYWdUcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oZSl7bXMucmVtb3ZlRnJvbVNlbGVjdGlvbigkKGUuY3VycmVudFRhcmdldCkuZGF0YShcImpzb25cIikpfSxfb25UcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmIShjZmcuZXhwYW5kT25Gb2N1cz09PXRydWUmJl9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbikpeyQobXMpLnRyaWdnZXIoXCJ0cmlnZ2VyY2xpY2tcIixbbXNdKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfWVsc2V7dmFyIGN1ckxlbmd0aD1tcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtpZihjdXJMZW5ndGg+PWNmZy5taW5DaGFycyl7bXMuaW5wdXQuZm9jdXMoKTttcy5leHBhbmQoKX1lbHNle3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWN1ckxlbmd0aCkpfX19fSxfb25XaW5kb3dSZXNpemVkOmZ1bmN0aW9uKCl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCl9fTtpZihlbGVtZW50IT09bnVsbCl7c2VsZi5fcmVuZGVyKGVsZW1lbnQpfX07JC5mbi5tYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24ob3B0aW9ucyl7dmFyIG9iaj0kKHRoaXMpO2lmKG9iai5zaXplKCk9PT0xJiZvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKSl7cmV0dXJuIG9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpfW9iai5lYWNoKGZ1bmN0aW9uKGkpe3ZhciBjbnRyPSQodGhpcyk7aWYoY250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIpKXtyZXR1cm59aWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJzZWxlY3RcIil7b3B0aW9ucy5kYXRhPVtdO29wdGlvbnMudmFsdWU9W107JC5lYWNoKHRoaXMuY2hpbGRyZW4sZnVuY3Rpb24oaW5kZXgsY2hpbGQpe2lmKGNoaWxkLm5vZGVOYW1lJiZjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJvcHRpb25cIil7b3B0aW9ucy5kYXRhLnB1c2goe2lkOmNoaWxkLnZhbHVlLG5hbWU6Y2hpbGQudGV4dH0pO2lmKCQoY2hpbGQpLmF0dHIoXCJzZWxlY3RlZFwiKSl7b3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKX19fSl9dmFyIGRlZj17fTskLmVhY2godGhpcy5hdHRyaWJ1dGVzLGZ1bmN0aW9uKGksYXR0KXtkZWZbYXR0Lm5hbWVdPWF0dC5uYW1lPT09XCJ2YWx1ZVwiJiZhdHQudmFsdWUhPT1cIlwiP0pTT04ucGFyc2UoYXR0LnZhbHVlKTphdHQudmFsdWV9KTt2YXIgZmllbGQ9bmV3IE1hZ2ljU3VnZ2VzdCh0aGlzLCQuZXh0ZW5kKFtdLCQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLG9wdGlvbnMsZGVmKSk7Y250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpO2ZpZWxkLmNvbnRhaW5lci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpfSk7aWYob2JqLnNpemUoKT09PTEpe3JldHVybiBvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKX1yZXR1cm4gb2JqfTskLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cz17fX0pKGpRdWVyeSk7IiwiLyoqXG4gKiBNdWx0aXBsZSBTZWxlY3Rpb24gQ29tcG9uZW50IGZvciBCb290c3RyYXBcbiAqIENoZWNrIG5pY29sYXNiaXplLmdpdGh1Yi5pby9tYWdpY3N1Z2dlc3QvIGZvciBsYXRlc3QgdXBkYXRlcy5cbiAqXG4gKiBBdXRob3I6ICAgICAgIE5pY29sYXMgQml6ZVxuICogQ3JlYXRlZDogICAgICBGZWIgOHRoIDIwMTNcbiAqIExhc3QgVXBkYXRlZDogT2N0IDE2dGggMjAxNFxuICogVmVyc2lvbjogICAgICAyLjEuNFxuICogTGljZW5jZTogICAgICBNYWdpY1N1Z2dlc3QgaXMgbGljZW5jZWQgdW5kZXIgTUlUIGxpY2VuY2UgKGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQpXG4gKi9cbihmdW5jdGlvbigkKVxue1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBNYWdpY1N1Z2dlc3QgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKVxuICAgIHtcbiAgICAgICAgdmFyIG1zID0gdGhpcztcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2ljU3VnZ2VzdCBjb21wb25lbnRcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIC8qKioqKioqKioqICBDT05GSUdVUkFUSU9OIFBST1BFUlRJRVMgKioqKioqKioqKioqL1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXN0cmljdHMgb3IgYWxsb3dzIHRoZSB1c2VyIHRvIHZhbGlkYXRlIHR5cGVkIGVudHJpZXMuXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhbGxvd0ZyZWVFbnRyaWVzOiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlc3RyaWN0cyBvciBhbGxvd3MgdGhlIHVzZXIgdG8gYWRkIHRoZSBzYW1lIGVudHJ5IG1vcmUgdGhhbiBvbmNlXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byBmYWxzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWxsb3dEdXBsaWNhdGVzOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIGNvbmZpZyBvYmplY3QgcGFzc2VkIHRvIGVhY2ggJC5hamF4IGNhbGxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWpheENvbmZpZzoge30sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgYSBzaW5nbGUgc3VnZ2VzdGlvbiBjb21lcyBvdXQsIGl0IGlzIHByZXNlbGVjdGVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhdXRvU2VsZWN0OiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEF1dG8gc2VsZWN0IHRoZSBmaXJzdCBtYXRjaGluZyBpdGVtIHdpdGggbXVsdGlwbGUgaXRlbXMgc2hvd25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0Rmlyc3Q6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFsbG93IGN1c3RvbWl6YXRpb24gb2YgcXVlcnkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHF1ZXJ5UGFyYW06ICdxdWVyeScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0cmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIGFqYXggcmVxdWVzdCBpcyBzZW50LCBzaW1pbGFyIHRvIGpRdWVyeVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbigpeyB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIENTUyBjbGFzcyB0byBhcHBseSB0byB0aGUgZmllbGQncyB1bmRlcmx5aW5nIGVsZW1lbnQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSlNPTiBEYXRhIHNvdXJjZSB1c2VkIHRvIHBvcHVsYXRlIHRoZSBjb21ibyBib3guIDMgb3B0aW9ucyBhcmUgYXZhaWxhYmxlIGhlcmU6XG4gICAgICAgICAgICAgKiBObyBEYXRhIFNvdXJjZSAoZGVmYXVsdClcbiAgICAgICAgICAgICAqICAgIFdoZW4gbGVmdCBudWxsLCB0aGUgY29tYm8gYm94IHdpbGwgbm90IHN1Z2dlc3QgYW55dGhpbmcuIEl0IGNhbiBzdGlsbCBlbmFibGUgdGhlIHVzZXIgdG8gZW50ZXJcbiAgICAgICAgICAgICAqICAgIG11bHRpcGxlIGVudHJpZXMgaWYgYWxsb3dGcmVlRW50cmllcyBpcyAqIHNldCB0byB0cnVlIChkZWZhdWx0KS5cbiAgICAgICAgICAgICAqIFN0YXRpYyBTb3VyY2VcbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gcGFzcyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMsIGFuIGFycmF5IG9mIHN0cmluZ3Mgb3IgZXZlbiBhIHNpbmdsZSBDU1Ygc3RyaW5nIGFzIHRoZVxuICAgICAgICAgICAgICogICAgZGF0YSBzb3VyY2UuRm9yIGV4LiBkYXRhOiBbKiB7aWQ6MCxuYW1lOlwiUGFyaXNcIn0sIHtpZDogMSwgbmFtZTogXCJOZXcgWW9ya1wifV1cbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gYWxzbyBwYXNzIGFueSBqc29uIG9iamVjdCB3aXRoIHRoZSByZXN1bHRzIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGpzb24gYXJyYXkuXG4gICAgICAgICAgICAgKiBVcmxcbiAgICAgICAgICAgICAqICAgICBZb3UgY2FuIHBhc3MgdGhlIHVybCBmcm9tIHdoaWNoIHRoZSBjb21wb25lbnQgd2lsbCBmZXRjaCBpdHMgSlNPTiBkYXRhLkRhdGEgd2lsbCBiZSBmZXRjaGVkXG4gICAgICAgICAgICAgKiAgICAgdXNpbmcgYSBQT1NUIGFqYXggcmVxdWVzdCB0aGF0IHdpbGwgKiBpbmNsdWRlIHRoZSBlbnRlcmVkIHRleHQgYXMgJ3F1ZXJ5JyBwYXJhbWV0ZXIuIFRoZSByZXN1bHRzXG4gICAgICAgICAgICAgKiAgICAgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIgY2FuIGJlOlxuICAgICAgICAgICAgICogICAgIC0gYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcbiAgICAgICAgICAgICAqICAgICAtIGEgc3RyaW5nIGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIHJlYWR5IHRvIGJlIHBhcnNlZCAoZXg6IFwiW3tpZDouLi4sbmFtZTouLi59LHsuLi59XVwiKVxuICAgICAgICAgICAgICogICAgIC0gYSBKU09OIG9iamVjdCB3aG9zZSBkYXRhIHdpbGwgYmUgY29udGFpbmVkIGluIHRoZSByZXN1bHRzIHByb3BlcnR5XG4gICAgICAgICAgICAgKiAgICAgIChleDoge3Jlc3VsdHM6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV1cbiAgICAgICAgICAgICAqIEZ1bmN0aW9uXG4gICAgICAgICAgICAgKiAgICAgWW91IGNhbiBwYXNzIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcbiAgICAgICAgICAgICAqICAgICBUaGUgZnVuY3Rpb24gY2FuIHJldHVybiB0aGUgSlNPTiBkYXRhIG9yIGl0IGNhbiB1c2UgdGhlIGZpcnN0IGFyZ3VtZW50IGFzIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgZGF0YS5cbiAgICAgICAgICAgICAqICAgICBPbmx5IG9uZSAoY2FsbGJhY2sgZnVuY3Rpb24gb3IgcmV0dXJuIHZhbHVlKSBpcyBuZWVkZWQgZm9yIHRoZSBmdW5jdGlvbiB0byBzdWNjZWVkLlxuICAgICAgICAgICAgICogICAgIFNlZSB0aGUgZm9sbG93aW5nIGV4YW1wbGU6XG4gICAgICAgICAgICAgKiAgICAgZnVuY3Rpb24gKHJlc3BvbnNlKSB7IHZhciBteWpzb24gPSBbe25hbWU6ICd0ZXN0JywgaWQ6IDF9XTsgcmVzcG9uc2UobXlqc29uKTsgcmV0dXJuIG15anNvbjsgfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyB0byB0aGUgYWpheCBjYWxsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRhdGFVcmxQYXJhbXM6IHt9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFN0YXJ0IHRoZSBjb21wb25lbnQgaW4gYSBkaXNhYmxlZCBzdGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCBkZWZpbmVzIHRoZSBkaXNhYmxlZCBiZWhhdmlvdXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzYWJsZWRGaWVsZDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGRpc3BsYXllZCBpbiB0aGUgY29tYm8gbGlzdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkaXNwbGF5RmllbGQ6ICduYW1lJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gZmFsc2UgaWYgeW91IG9ubHkgd2FudCBtb3VzZSBpbnRlcmFjdGlvbi4gSW4gdGhhdCBjYXNlIHRoZSBjb21ibyB3aWxsXG4gICAgICAgICAgICAgKiBhdXRvbWF0aWNhbGx5IGV4cGFuZCBvbiBmb2N1cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZWRpdGFibGU6IHRydWUsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHN0YXJ0aW5nIHN0YXRlIGZvciBjb21iby5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXhwYW5kZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEF1dG9tYXRpY2FsbHkgZXhwYW5kcyBjb21ibyBvbiBmb2N1cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXhwYW5kT25Gb2N1czogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSlNPTiBwcm9wZXJ0eSBieSB3aGljaCB0aGUgbGlzdCBzaG91bGQgYmUgZ3JvdXBlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBncm91cEJ5OiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGhpZGUgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhpZGVUcmlnZ2VyOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBoaWdobGlnaHQgc2VhcmNoIGlucHV0IHdpdGhpbiBkaXNwbGF5ZWQgc3VnZ2VzdGlvbnNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIElEIGZvciB0aGlzIGNvbXBvbmVudFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGNsYXNzIHRoYXQgaXMgYWRkZWQgdG8gdGhlIGluZm8gbWVzc2FnZSBhcHBlYXJpbmcgb24gdGhlIHRvcC1yaWdodCBwYXJ0IG9mIHRoZSBjb21wb25lbnRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5mb01zZ0NsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHBhc3NlZCBvdXQgdG8gdGhlIElOUFVUIHRhZy4gRW5hYmxlcyB1c2FnZSBvZiBBbmd1bGFySlMncyBjdXN0b20gdGFncyBmb3IgZXguXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlucHV0Q2ZnOiB7fSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgY2xhc3MgdGhhdCBpcyBhcHBsaWVkIHRvIHNob3cgdGhhdCB0aGUgZmllbGQgaXMgaW52YWxpZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnZhbGlkQ2xzOiAnbXMtaW52JyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBmaWx0ZXIgZGF0YSByZXN1bHRzIGFjY29yZGluZyB0byBjYXNlLiBVc2VsZXNzIGlmIHRoZSBkYXRhIGlzIGZldGNoZWQgcmVtb3RlbHlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF0Y2hDYXNlOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBPbmNlIGV4cGFuZGVkLCB0aGUgY29tYm8ncyBoZWlnaHQgd2lsbCB0YWtlIGFzIG11Y2ggcm9vbSBhcyB0aGUgIyBvZiBhdmFpbGFibGUgcmVzdWx0cy5cbiAgICAgICAgICAgICAqICAgIEluIGNhc2UgdGhlcmUgYXJlIHRvbyBtYW55IHJlc3VsdHMgZGlzcGxheWVkLCB0aGlzIHdpbGwgZml4IHRoZSBkcm9wIGRvd24gaGVpZ2h0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhEcm9wSGVpZ2h0OiAyOTAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVmaW5lcyBob3cgbG9uZyB0aGUgdXNlciBmcmVlIGVudHJ5IGNhbiBiZS4gU2V0IHRvIG51bGwgZm9yIG5vIGxpbWl0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhFbnRyeUxlbmd0aDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IGVudHJ5IGxlbmd0aCBoYXMgYmVlbiBzdXJwYXNzZWQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heEVudHJ5UmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1BsZWFzZSByZWR1Y2UgeW91ciBlbnRyeSBieSAnICsgdiArICcgY2hhcmFjdGVyJyArICh2ID4gMSA/ICdzJzonJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiByZXN1bHRzIGRpc3BsYXllZCBpbiB0aGUgY29tYm8gZHJvcCBkb3duIGF0IG9uY2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFN1Z2dlc3Rpb25zOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0aGUgdXNlciBjYW4gc2VsZWN0IGlmIG11bHRpcGxlIHNlbGVjdGlvbiBpcyBhbGxvd2VkLlxuICAgICAgICAgICAgICogICAgU2V0IHRvIG51bGwgdG8gcmVtb3ZlIHRoZSBsaW1pdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4U2VsZWN0aW9uOiAxMCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IHNlbGVjdGlvbiBhbW91bnQgaGFzIGJlZW4gcmVhY2hlZC4gVGhlIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZVxuICAgICAgICAgICAgICogICAgcGFyYW1ldGVyIHdoaWNoIGlzIHRoZSBudW1iZXIgb2Ygc2VsZWN0ZWQgZWxlbWVudHMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFNlbGVjdGlvblJlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gJyArIHYgKyAnIGl0ZW0nICsgKHYgPiAxID8gJ3MnOicnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG1ldGhvZCB1c2VkIGJ5IHRoZSBhamF4IHJlcXVlc3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtaW5pbXVtIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRoZSB1c2VyIG11c3QgdHlwZSBiZWZvcmUgdGhlIGNvbWJvIGV4cGFuZHMgYW5kIG9mZmVycyBzdWdnZXN0aW9ucy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWluQ2hhcnM6IDAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gbm90IGVub3VnaCBsZXR0ZXJzIGFyZSBzZXQuIFRoZSBmdW5jdGlvbiBoYXMgYSBzaW5nbGVcbiAgICAgICAgICAgICAqICAgIHBhcmFtZXRlciB3aGljaCBpcyB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSByZXF1aXJlZCBhbW91bnQgb2YgbGV0dGVycyBhbmQgdGhlIGN1cnJlbnQgb25lLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW5DaGFyc1JlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdQbGVhc2UgdHlwZSAnICsgdiArICcgbW9yZSBjaGFyYWN0ZXInICsgKHYgPiAxID8gJ3MnOicnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogV2hldGhlciBvciBub3Qgc29ydGluZyAvIGZpbHRlcmluZyBzaG91bGQgYmUgZG9uZSByZW1vdGVseSBvciBsb2NhbGx5LlxuICAgICAgICAgICAgICogVXNlIGVpdGhlciAnbG9jYWwnIG9yICdyZW1vdGUnXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1vZGU6ICdsb2NhbCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG5hbWUgdXNlZCBhcyBhIGZvcm0gZWxlbWVudC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbmFtZTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGV4dCBkaXNwbGF5ZWQgd2hlbiB0aGVyZSBhcmUgbm8gc3VnZ2VzdGlvbnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG5vU3VnZ2VzdGlvblRleHQ6ICdObyBzdWdnZXN0aW9ucycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIGRlZmF1bHQgcGxhY2Vob2xkZXIgdGV4dCB3aGVuIG5vdGhpbmcgaGFzIGJlZW4gZW50ZXJlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1R5cGUgb3IgY2xpY2sgaGVyZScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB1c2VkIHRvIGRlZmluZSBob3cgdGhlIGl0ZW1zIHdpbGwgYmUgcHJlc2VudGVkIGluIHRoZSBjb21ib1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZW5kZXJlcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGlzIGZpZWxkIHNob3VsZCBiZSByZXF1aXJlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gcmVuZGVyIHNlbGVjdGlvbiBhcyBhIGRlbGltaXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVzdWx0QXNTdHJpbmc6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRleHQgZGVsaW1pdGVyIHRvIHVzZSBpbiBhIGRlbGltaXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOiAnLCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgdGhlIGxpc3Qgb2Ygc3VnZ2VzdGVkIG9iamVjdHNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVzdWx0c0ZpZWxkOiAncmVzdWx0cycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBjdXN0b20gQ1NTIGNsYXNzIHRvIGFkZCB0byBhIHNlbGVjdGVkIGl0ZW1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uQ2xzOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbiBvcHRpb25hbCBlbGVtZW50IHJlcGxhY2VtZW50IGluIHdoaWNoIHRoZSBzZWxlY3Rpb24gaXMgcmVuZGVyZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uQ29udGFpbmVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFdoZXJlIHRoZSBzZWxlY3RlZCBpdGVtcyB3aWxsIGJlIGRpc3BsYXllZC4gT25seSAncmlnaHQnLCAnYm90dG9tJyBhbmQgJ2lubmVyJyBhcmUgdmFsaWQgdmFsdWVzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblBvc2l0aW9uOiAnaW5uZXInLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdXNlZCB0byBkZWZpbmUgaG93IHRoZSBpdGVtcyB3aWxsIGJlIHByZXNlbnRlZCBpbiB0aGUgdGFnIGxpc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uUmVuZGVyZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gc3RhY2sgdGhlIHNlbGVjdGlvbmVkIGl0ZW1zIHdoZW4gcG9zaXRpb25lZCBvbiB0aGUgYm90dG9tXG4gICAgICAgICAgICAgKiAgICBSZXF1aXJlcyB0aGUgc2VsZWN0aW9uUG9zaXRpb24gdG8gYmUgc2V0IHRvICdib3R0b20nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblN0YWNrZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERpcmVjdGlvbiB1c2VkIGZvciBzb3J0aW5nLiBPbmx5ICdhc2MnIGFuZCAnZGVzYycgYXJlIHZhbGlkIHZhbHVlc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzb3J0RGlyOiAnYXNjJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBuYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGZvciBsb2NhbCByZXN1bHQgc29ydGluZy5cbiAgICAgICAgICAgICAqICAgIExlYXZlIG51bGwgaWYgeW91IGRvIG5vdCB3aXNoIHRoZSByZXN1bHRzIHRvIGJlIG9yZGVyZWQgb3IgaWYgdGhleSBhcmUgYWxyZWFkeSBvcmRlcmVkIHJlbW90ZWx5LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzb3J0T3JkZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHN1Z2dlc3Rpb25zIHdpbGwgaGF2ZSB0byBzdGFydCBieSB1c2VyIGlucHV0IChhbmQgbm90IHNpbXBseSBjb250YWluIGl0IGFzIGEgc3Vic3RyaW5nKVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzdHJpY3RTdWdnZXN0OiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDdXN0b20gc3R5bGUgYWRkZWQgdG8gdGhlIGNvbXBvbmVudCBjb250YWluZXIuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHN0eWxlOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGNvbWJvIHdpbGwgZXhwYW5kIC8gY29sbGFwc2Ugd2hlbiBjbGlja2VkIHVwb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdG9nZ2xlT25DbGljazogZmFsc2UsXG5cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbW91bnQgKGluIG1zKSBiZXR3ZWVuIGtleWJvYXJkIHJlZ2lzdGVycy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdHlwZURlbGF5OiA0MDAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHRhYiB3b24ndCBibHVyIHRoZSBjb21wb25lbnQgYnV0IHdpbGwgYmUgcmVnaXN0ZXJlZCBhcyB0aGUgRU5URVIga2V5XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVzZVRhYktleTogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHVzaW5nIGNvbW1hIHdpbGwgdmFsaWRhdGUgdGhlIHVzZXIncyBjaG9pY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdXNlQ29tbWFLZXk6IHRydWUsXG5cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRoZSByZXN1bHRzIHdpbGwgYmUgZGlzcGxheWVkIHdpdGggYSB6ZWJyYSB0YWJsZSBzdHlsZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1c2VaZWJyYVN0eWxlOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBpbml0aWFsIHZhbHVlIGZvciB0aGUgZmllbGRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFsdWU6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgaXRzIHVuZGVybHlpbmcgdmFsdWVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFsdWVGaWVsZDogJ2lkJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiByZWd1bGFyIGV4cHJlc3Npb24gdG8gdmFsaWRhdGUgdGhlIHZhbHVlcyBhZ2FpbnN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZyZWdleDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiB0eXBlIHRvIHZhbGlkYXRlIGFnYWluc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdnR5cGU6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY29uZiA9ICQuZXh0ZW5kKHt9LG9wdGlvbnMpO1xuICAgICAgICB2YXIgY2ZnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25mKTtcblxuICAgICAgICAvKioqKioqKioqKiAgUFVCTElDIE1FVEhPRFMgKioqKioqKioqKioqL1xuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIG9uZSBvciBtdWx0aXBsZSBqc29uIGl0ZW1zIHRvIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zLCBpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCFjZmcubWF4U2VsZWN0aW9uIHx8IF9zZWxlY3Rpb24ubGVuZ3RoIDwgY2ZnLm1heFNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICghJC5pc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZWNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYWxsb3dEdXBsaWNhdGVzIHx8ICQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSwgbXMuZ2V0VmFsdWUoKSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnB1c2goanNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZWNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1NpbGVudCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbdGhpcywgdGhpcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbihpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uKF9zZWxlY3Rpb24uc2xpY2UoMCksIGlzU2lsZW50KTsgLy8gY2xvbmUgYXJyYXkgdG8gYXZvaWQgY29uY3VycmVuY3kgaXNzdWVzXG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbGxhcHNlIHRoZSBkcm9wIGRvd24gcGFydCBvZiB0aGUgY29tYm9cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGFwc2UgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWJvYm94LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignY29sbGFwc2UnLCBbdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgdGhlIGNvbXBvbmVudCBpbiBhIGRpc2FibGVkIHN0YXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5kaXNhYmxlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWRpc2FibGVkJyk7XG4gICAgICAgICAgICBjZmcuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW1wdGllcyBvdXQgdGhlIGNvbWJvIHVzZXIgdGV4dFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbXB0eSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmlucHV0LnZhbCgnJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB0aGUgY29tcG9uZW50IGluIGEgZW5hYmxlIHN0YXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbmFibGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdtcy1jdG4tZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNmZy5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV4cGFuZCB0aGUgZHJvcCBkcm93biBwYXJ0IG9mIHRoZSBjb21iby5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXhwYW5kID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIWNmZy5leHBhbmRlZCAmJiAodGhpcy5pbnB1dC52YWwoKS5sZW5ndGggPj0gY2ZnLm1pbkNoYXJzIHx8IHRoaXMuY29tYm9ib3guY2hpbGRyZW4oKS5zaXplKCkgPiAwKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tYm9ib3guYXBwZW5kVG8odGhpcy5jb250YWluZXIpO1xuICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdleHBhbmQnLCBbdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBjb21wb25lbnQgZW5hYmxlZCBzdGF0dXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5kaXNhYmxlZDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGZpZWxkIGlzIHZhbGlkIG9yIG5vdFxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc1ZhbGlkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmFsaWQgPSBjZmcucmVxdWlyZWQgPT09IGZhbHNlIHx8IF9zZWxlY3Rpb24ubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGlmKGNmZy52dHlwZSB8fCBjZmcudnJlZ2V4KXtcbiAgICAgICAgICAgICAgICAkLmVhY2goX3NlbGVjdGlvbiwgZnVuY3Rpb24oaW5kZXgsIGl0ZW0pe1xuICAgICAgICAgICAgICAgICAgICB2YWxpZCA9IHZhbGlkICYmIHNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbShpdGVtW2NmZy52YWx1ZUZpZWxkXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHMgdGhlIGRhdGEgcGFyYW1zIGZvciBjdXJyZW50IGFqYXggcmVxdWVzdFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHMgdGhlIG5hbWUgZ2l2ZW4gdG8gdGhlIGZvcm0gaW5wdXRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0TmFtZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5uYW1lO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBhbiBhcnJheSBvZiBzZWxlY3RlZCBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHJldHVybiB7QXJyYXl9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIF9zZWxlY3Rpb247XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBjdXJyZW50IHRleHQgZW50ZXJlZCBieSB0aGUgdXNlclxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRSYXdWYWx1ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gbXMuaW5wdXQudmFsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIGFuIGFycmF5IG9mIHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRWYWx1ZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICQubWFwKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb1tjZmcudmFsdWVGaWVsZF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIG9uZSBvciBtdWx0aXBsZXMganNvbiBpdGVtcyBmcm9tIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMsIGlzU2lsZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoISQuaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFsdWVjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSAkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sIG1zLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYoaXNTaWxlbnQgIT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFt0aGlzLCB0aGlzLmdldFNlbGVjdGlvbigpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiB0aGlzLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldCBjdXJyZW50IGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gX2NiRGF0YTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHVwIHNvbWUgY29tYm8gZGF0YSBhZnRlciBpdCBoYXMgYmVlbiByZW5kZXJlZFxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBjZmcuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyB0aGUgbmFtZSBmb3IgdGhlIGlucHV0IGZpZWxkIHNvIGl0IGNhbiBiZSBmZXRjaGVkIGluIHRoZSBmb3JtXG4gICAgICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldE5hbWUgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgICAgIGNmZy5uYW1lID0gbmFtZTtcbiAgICAgICAgICAgIGlmKG5hbWUpe1xuICAgICAgICAgICAgICAgIGNmZy5uYW1lICs9IG5hbWUuaW5kZXhPZignW10nKSA+IDAgPyAnJyA6ICdbXSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIpe1xuICAgICAgICAgICAgICAgICQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSwgZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgICAgICAgICBlbC5uYW1lID0gY2ZnLm5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHdpdGggdGhlIEpTT04gaXRlbXMgcHJvdmlkZWRcbiAgICAgICAgICogQHBhcmFtIGl0ZW1zXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zKXtcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGEgdmFsdWUgZm9yIHRoZSBjb21ibyBib3guIFZhbHVlIG11c3QgYmUgYW4gYXJyYXkgb2YgdmFsdWVzIHdpdGggZGF0YSB0eXBlIG1hdGNoaW5nIHZhbHVlRmllbGQgb25lLlxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlcylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGl0ZW1zID0gW107XG5cbiAgICAgICAgICAgICQuZWFjaCh2YWx1ZXMsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGZpcnN0IHRyeSB0byBzZWUgaWYgd2UgaGF2ZSB0aGUgZnVsbCBvYmplY3RzIGZyb20gb3VyIGRhdGEgc2V0XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJC5lYWNoKF9jYkRhdGEsIGZ1bmN0aW9uKGksaXRlbSl7XG4gICAgICAgICAgICAgICAgICAgIGlmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdID09IHZhbHVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZighZm91bmQpe1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YodmFsdWUpID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW2NmZy52YWx1ZUZpZWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbltjZmcuZGlzcGxheUZpZWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYoaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGRhdGEgcGFyYW1zIGZvciBzdWJzZXF1ZW50IGFqYXggcmVxdWVzdHNcbiAgICAgICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKVxuICAgICAgICB7XG4gICAgICAgICAgICBjZmcuZGF0YVVybFBhcmFtcyA9ICQuZXh0ZW5kKHt9LHBhcmFtcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqKioqKioqKiogIFBSSVZBVEUgKioqKioqKioqKioqL1xuICAgICAgICB2YXIgX3NlbGVjdGlvbiA9IFtdLCAgICAgIC8vIHNlbGVjdGVkIG9iamVjdHNcbiAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSAwLCAvLyBoZWlnaHQgZm9yIGVhY2ggY29tYm8gaXRlbS5cbiAgICAgICAgICAgIF90aW1lcixcbiAgICAgICAgICAgIF9oYXNGb2N1cyA9IGZhbHNlLFxuICAgICAgICAgICAgX2dyb3VwcyA9IG51bGwsXG4gICAgICAgICAgICBfY2JEYXRhID0gW10sXG4gICAgICAgICAgICBfY3RybERvd24gPSBmYWxzZSxcbiAgICAgICAgICAgIEtFWUNPREVTID0ge1xuICAgICAgICAgICAgICAgIEJBQ0tTUEFDRTogOCxcbiAgICAgICAgICAgICAgICBUQUI6IDksXG4gICAgICAgICAgICAgICAgRU5URVI6IDEzLFxuICAgICAgICAgICAgICAgIENUUkw6IDE3LFxuICAgICAgICAgICAgICAgIEVTQzogMjcsXG4gICAgICAgICAgICAgICAgU1BBQ0U6IDMyLFxuICAgICAgICAgICAgICAgIFVQQVJST1c6IDM4LFxuICAgICAgICAgICAgICAgIERPV05BUlJPVzogNDAsXG4gICAgICAgICAgICAgICAgQ09NTUE6IDE4OFxuICAgICAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbXB0aWVzIHRoZSByZXN1bHQgY29udGFpbmVyIGFuZCByZWZpbGxzIGl0IHdpdGggdGhlIGFycmF5IG9mIGpzb24gcmVzdWx0cyBpbiBpbnB1dFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2Rpc3BsYXlTdWdnZXN0aW9uczogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNob3coKTtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5lbXB0eSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHJlc0hlaWdodCA9IDAsIC8vIHRvdGFsIGhlaWdodCB0YWtlbiBieSBkaXNwbGF5ZWQgcmVzdWx0cy5cbiAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgPSAwO1xuXG4gICAgICAgICAgICAgICAgaWYoX2dyb3VwcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSBfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWdyb3VwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBncnBOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKF9ncm91cHNbZ3JwTmFtZV0uaXRlbXMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBfZ3JvdXBJdGVtSGVpZ2h0ID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1ncm91cCcpLm91dGVySGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKF9ncm91cEl0ZW1IZWlnaHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wUmVzSGVpZ2h0ID0gbmJHcm91cHMgKiBfZ3JvdXBJdGVtSGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IChfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGgpICsgdG1wUmVzSGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IF9jb21ib0l0ZW1IZWlnaHQgKiAoZGF0YS5sZW5ndGggKyBuYkdyb3Vwcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihyZXNIZWlnaHQgPCBtcy5jb21ib2JveC5oZWlnaHQoKSB8fCByZXNIZWlnaHQgPD0gY2ZnLm1heERyb3BIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGVpZ2h0KHJlc0hlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYocmVzSGVpZ2h0ID49IG1zLmNvbWJvYm94LmhlaWdodCgpICYmIHJlc0hlaWdodCA+IGNmZy5tYXhEcm9wSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDEgJiYgY2ZnLmF1dG9TZWxlY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0JykuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjZmcuc2VsZWN0Rmlyc3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpLmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRSYXdWYWx1ZSgpICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBub1N1Z2dlc3Rpb25UZXh0ID0gY2ZnLm5vU3VnZ2VzdGlvblRleHQucmVwbGFjZSgvXFx7XFx7LipcXH1cXH0vLCBtcy5pbnB1dC52YWwoKSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihub1N1Z2dlc3Rpb25UZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXaGVuIGZyZWUgZW50cnkgaXMgb2ZmLCBhZGQgaW52YWxpZCBjbGFzcyB0byBpbnB1dCBpZiBubyBkYXRhIG1hdGNoZXNcbiAgICAgICAgICAgICAgICBpZihjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJChtcy5pbnB1dCkuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQobXMuaW5wdXQpLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YganNvbiBvYmplY3RzIGZyb20gYW4gYXJyYXkgb2Ygc3RyaW5ncy5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSBbXTtcbiAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVudHJ5ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5W2NmZy5kaXNwbGF5RmllbGRdID0gZW50cnlbY2ZnLnZhbHVlRmllbGRdID0gJC50cmltKHMpO1xuICAgICAgICAgICAgICAgICAgICBqc29uLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBqc29uO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXBsYWNlcyBodG1sIHdpdGggaGlnaGxpZ2h0ZWQgaHRtbCBhY2NvcmRpbmcgdG8gY2FzZVxuICAgICAgICAgICAgICogQHBhcmFtIGh0bWxcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9oaWdobGlnaHRTdWdnZXN0aW9uOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgICAgICAgICAgdmFyIHEgPSBtcy5pbnB1dC52YWwoKTtcblxuICAgICAgICAgICAgICAgIC8vZXNjYXBlIHNwZWNpYWwgcmVnZXggY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHZhciBzcGVjaWFsQ2hhcmFjdGVycyA9IFsnXicsICckJywgJyonLCAnKycsICc/JywgJy4nLCAnKCcsICcpJywgJzonLCAnIScsICd8JywgJ3snLCAnfScsICdbJywgJ10nXTtcblxuICAgICAgICAgICAgICAgICQuZWFjaChzcGVjaWFsQ2hhcmFjdGVycywgZnVuY3Rpb24gKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBxID0gcS5yZXBsYWNlKHZhbHVlLCBcIlxcXFxcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGh0bWw7IC8vIG5vdGhpbmcgZW50ZXJlZCBhcyBpbnB1dFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBnbG9iID0gY2ZnLm1hdGNoQ2FzZSA9PT0gdHJ1ZSA/ICdnJyA6ICdnaSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0bWwucmVwbGFjZShuZXcgUmVnRXhwKCcoJyArIHEgKyAnKSg/IShbXjxdKyk/PiknLCBnbG9iKSwgJzxlbT4kMTwvZW0+Jyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE1vdmVzIHRoZSBzZWxlY3RlZCBjdXJzb3IgYW1vbmdzdCB0aGUgbGlzdCBpdGVtXG4gICAgICAgICAgICAgKiBAcGFyYW0gZGlyIC0gJ3VwJyBvciAnZG93bidcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9tb3ZlU2VsZWN0ZWRSb3c6IGZ1bmN0aW9uKGRpcikge1xuICAgICAgICAgICAgICAgIGlmKCFjZmcuZXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBsaXN0LCBzdGFydCwgYWN0aXZlLCBzY3JvbGxQb3M7XG4gICAgICAgICAgICAgICAgbGlzdCA9IG1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIik7XG4gICAgICAgICAgICAgICAgaWYoZGlyID09PSAnZG93bicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0aXZlID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpO1xuICAgICAgICAgICAgICAgIGlmKGFjdGl2ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGRpciA9PT0gJ2Rvd24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5uZXh0QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsUG9zID0gbXMuY29tYm9ib3guc2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydFswXS5vZmZzZXRUb3AgKyBzdGFydC5vdXRlckhlaWdodCgpID4gbXMuY29tYm9ib3guaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3Aoc2Nyb2xsUG9zICsgX2NvbWJvSXRlbUhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5wcmV2QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoX2NvbWJvSXRlbUhlaWdodCAqIGxpc3QubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0WzBdLm9mZnNldFRvcCA8IG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpIC0gX2NvbWJvSXRlbUhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGlzdC5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcbiAgICAgICAgICAgICAgICBzdGFydC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWNjb3JkaW5nIHRvIGdpdmVuIGRhdGEgYW5kIHF1ZXJ5LCBzb3J0IGFuZCBhZGQgc3VnZ2VzdGlvbnMgaW4gdGhlaXIgY29udGFpbmVyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcHJvY2Vzc1N1Z2dlc3Rpb25zOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIganNvbiA9IG51bGwsIGRhdGEgPSBzb3VyY2UgfHwgY2ZnLmRhdGE7XG4gICAgICAgICAgICAgICAgaWYoZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoZGF0YSkgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGRhdGEuY2FsbChtcywgbXMuZ2V0UmF3VmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEpID09PSAnc3RyaW5nJykgeyAvLyBnZXQgcmVzdWx0cyBmcm9tIGFqYXhcbiAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2JlZm9yZWxvYWQnLCBbbXNdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVBhcmFtc1tjZmcucXVlcnlQYXJhbV0gPSBtcy5pbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSAkLmV4dGVuZChxdWVyeVBhcmFtcywgY2ZnLmRhdGFVcmxQYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJC5hamF4KCQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjZmcubWV0aG9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogY2ZnLmJlZm9yZVNlbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oYXN5bmNEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbiA9IHR5cGVvZihhc3luY0RhdGEpID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UoYXN5bmNEYXRhKSA6IGFzeW5jRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdsb2FkJywgW21zLCBqc29uXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGYuX2FzeW5jVmFsdWVzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKHR5cGVvZihzZWxmLl9hc3luY1ZhbHVlcykgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShzZWxmLl9hc3luY1ZhbHVlcykgOiBzZWxmLl9hc3luY1ZhbHVlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZShzZWxmLl9hc3luY1ZhbHVlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyhcIkNvdWxkIG5vdCByZWFjaCBzZXJ2ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgY2ZnLmFqYXhDb25maWcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVzdWx0cyBmcm9tIGxvY2FsIGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA+IDAgJiYgdHlwZW9mKGRhdGFbMF0pID09PSAnc3RyaW5nJykgeyAvLyByZXN1bHRzIGZyb20gYXJyYXkgb2Ygc3RyaW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBzZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVndWxhciBqc29uIGFycmF5IG9yIGpzb24gb2JqZWN0IHdpdGggcmVzdWx0cyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBkYXRhW2NmZy5yZXN1bHRzRmllbGRdIHx8IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBjZmcubW9kZSA9PT0gJ3JlbW90ZScgPyBfY2JEYXRhIDogc2VsZi5fc29ydEFuZFRyaW0oX2NiRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2Rpc3BsYXlTdWdnZXN0aW9ucyhzZWxmLl9ncm91cChzb3J0ZWREYXRhKSk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbmRlciB0aGUgY29tcG9uZW50IHRvIHRoZSBnaXZlbiBpbnB1dCBET00gZWxlbWVudFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3JlbmRlcjogZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgICAgICBtcy5zZXROYW1lKGNmZy5uYW1lKTsgIC8vIG1ha2Ugc3VyZSB0aGUgZm9ybSBuYW1lIGlzIGNvcnJlY3RcbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgbWFpbiBkaXYsIHdpbGwgcmVsYXkgdGhlIGZvY3VzIGV2ZW50cyB0byB0aGUgY29udGFpbmVkIGlucHV0IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY3RuIGZvcm0tY29udHJvbCAnICsgKGNmZy5yZXN1bHRBc1N0cmluZyA/ICdtcy1hcy1zdHJpbmcgJyA6ICcnKSArIGNmZy5jbHMgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1sZycpID8gJyBpbnB1dC1sZycgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1zbScpID8gJyBpbnB1dC1zbScgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5kaXNhYmxlZCA9PT0gdHJ1ZSA/ICcgbXMtY3RuLWRpc2FibGVkJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWN0bi1yZWFkb25seScpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlID8gJycgOiAnIG1zLW5vLXRyaWdnZXInKSxcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IGNmZy5zdHlsZSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGNmZy5pZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmJsdXIoJC5wcm94eShoYW5kbGVycy5fb25CbHVyLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleWRvd24oJC5wcm94eShoYW5kbGVycy5fb25LZXlEb3duLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgIG1zLmlucHV0ID0gJCgnPGlucHV0Lz4nLCAkLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWlucHV0LXJlYWRvbmx5JyxcbiAgICAgICAgICAgICAgICAgICAgcmVhZG9ubHk6ICFjZmcuZWRpdGFibGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjZmcucGxhY2Vob2xkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjZmcuZGlzYWJsZWRcbiAgICAgICAgICAgICAgICB9LCBjZmcuaW5wdXRDZmcpKTtcblxuICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmlucHV0LmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRDbGljaywgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHN1Z2dlc3Rpb25zLiB3aWxsIGFsd2F5cyBiZSBwbGFjZWQgb24gZm9jdXNcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1jdG4gZHJvcGRvd24tbWVudSdcbiAgICAgICAgICAgICAgICB9KS5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgLy8gYmluZCB0aGUgb25jbGljayBhbmQgbW91c2VvdmVyIHVzaW5nIGRlbGVnYXRlZCBldmVudHMgKG5lZWRzIGpRdWVyeSA+PSAxLjcpXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3gub24oJ2NsaWNrJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtU2VsZWN0ZWQsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5vbignbW91c2VvdmVyJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtTW91c2VPdmVyLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcjtcbiAgICAgICAgICAgICAgICAgICAgJChtcy5zZWxlY3Rpb25Db250YWluZXIpLmFkZENsYXNzKCdtcy1zZWwtY3RuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1jdG4nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cywgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmICFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbXMuaGVscGVyID0gJCgnPHNwYW4vPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWhlbHBlciAnICsgY2ZnLmluZm9Nc2dDbHNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoKTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLmhlbHBlcik7XG5cblxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgd2hvbGUgdGhpbmdcbiAgICAgICAgICAgICAgICAkKGVsKS5yZXBsYWNlV2l0aChtcy5jb250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2goY2ZnLnNlbGVjdGlvblBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib3R0b20nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25TdGFja2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci53aWR0aChtcy5jb250YWluZXIud2lkdGgoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hZGRDbGFzcygnbXMtc3RhY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuY3NzKCdmbG9hdCcsICdsZWZ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuc2VsZWN0aW9uQ29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0IHNpZGVcbiAgICAgICAgICAgICAgICBpZihjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnRyaWdnZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtdHJpZ2dlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiAnPGRpdiBjbGFzcz1cIm1zLXRyaWdnZXItaWNvXCI+PC9kaXY+J1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgbXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljaywgdGhpcykpO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLnRyaWdnZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQod2luZG93KS5yZXNpemUoJC5wcm94eShoYW5kbGVycy5fb25XaW5kb3dSZXNpemVkLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBkbyBub3QgcGVyZm9ybSBhbiBpbml0aWFsIGNhbGwgaWYgd2UgYXJlIHVzaW5nIGFqYXggdW5sZXNzIHdlIGhhdmUgaW5pdGlhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwgfHwgY2ZnLmRhdGEgIT09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoY2ZnLmRhdGEpID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9hc3luY1ZhbHVlcyA9IGNmZy52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKGNmZy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQoXCJib2R5XCIpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobXMuY29udGFpbmVyLmhhc0NsYXNzKCdtcy1jdG4tZm9jdXMnKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmhhcyhlLnRhcmdldCkubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbXMtcmVzLWl0ZW0nKSA8IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKCdtcy1jbG9zZS1idG4nKSA8IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lclswXSAhPT0gZS50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbmRlcnMgZWFjaCBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcmVuZGVyQ29tYm9JdGVtczogZnVuY3Rpb24oaXRlbXMsIGlzR3JvdXBlZCkge1xuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCBodG1sID0gJyc7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpc3BsYXllZCA9IGNmZy5yZW5kZXJlciAhPT0gbnVsbCA/IGNmZy5yZW5kZXJlci5jYWxsKHJlZiwgdmFsdWUpIDogdmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNhYmxlZCA9IGNmZy5kaXNhYmxlZEZpZWxkICE9PSBudWxsICYmIHZhbHVlW2NmZy5kaXNhYmxlZEZpZWxkXSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtaXRlbSAnICsgKGlzR3JvdXBlZCA/ICdtcy1yZXMtaXRlbS1ncm91cGVkICc6JycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGlzYWJsZWQgPyAnbXMtcmVzLWl0ZW0tZGlzYWJsZWQgJzonJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChpbmRleCAlIDIgPT09IDEgJiYgY2ZnLnVzZVplYnJhU3R5bGUgPT09IHRydWUgPyAnbXMtcmVzLW9kZCcgOiAnJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBjZmcuaGlnaGxpZ2h0ID09PSB0cnVlID8gc2VsZi5faGlnaGxpZ2h0U3VnZ2VzdGlvbihkaXNwbGF5ZWQpIDogZGlzcGxheWVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGEtanNvbic6IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAkKCc8ZGl2Lz4nKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guYXBwZW5kKGh0bWwpO1xuICAgICAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW06Zmlyc3QnKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW5kZXJzIHRoZSBzZWxlY3RlZCBpdGVtcyBpbnRvIHRoZWlyIGNvbnRhaW5lci5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9yZW5kZXJTZWxlY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCB3ID0gMCwgaW5wdXRPZmZzZXQgPSAwLCBpdGVtcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBhc1RleHQgPSBjZmcucmVzdWx0QXNTdHJpbmcgPT09IHRydWUgJiYgIV9oYXNGb2N1cztcblxuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5maW5kKCcubXMtc2VsLWl0ZW0nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJC5lYWNoKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSl7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkSXRlbUVsLCBkZWxJdGVtRWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1IdG1sID0gY2ZnLnNlbGVjdGlvblJlbmRlcmVyICE9PSBudWxsID8gY2ZnLnNlbGVjdGlvblJlbmRlcmVyLmNhbGwocmVmLCB2YWx1ZSkgOiB2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsaWRDbHMgPSBzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0odmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF0pID8gJycgOiAnIG1zLXNlbC1pbnZhbGlkJztcblxuICAgICAgICAgICAgICAgICAgICAvLyB0YWcgcmVwcmVzZW50aW5nIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGlmKGFzVGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1pdGVtIG1zLXNlbC10ZXh0ICcgKyBjZmcuc2VsZWN0aW9uQ2xzICsgdmFsaWRDbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogc2VsZWN0ZWRJdGVtSHRtbCArIChpbmRleCA9PT0gKF9zZWxlY3Rpb24ubGVuZ3RoIC0gMSkgPyAnJyA6IGNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWl0ZW0gJyArIGNmZy5zZWxlY3Rpb25DbHMgKyB2YWxpZENscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBzZWxlY3RlZEl0ZW1IdG1sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZGlzYWJsZWQgPT09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzbWFsbCBjcm9zcyBpbWdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxJdGVtRWwgPSAkKCc8c3Bhbi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY2xvc2UtYnRuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsSXRlbUVsLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVGFnVHJpZ2dlckNsaWNrLCByZWYpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goc2VsZWN0ZWRJdGVtRWwpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5wcmVwZW5kKGl0ZW1zKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIHRoZSB2YWx1ZXMsIGJlaGF2aW91ciBvZiBtdWx0aXBsZSBzZWxlY3RcbiAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiAnZGlzcGxheTogbm9uZTsnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJC5lYWNoKG1zLmdldFZhbHVlKCksIGZ1bmN0aW9uKGksIHZhbCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbCA9ICQoJzxpbnB1dC8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjZmcubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZFRvKG1zLl92YWx1ZUNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyLmFwcGVuZFRvKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgIWNmZy5zZWxlY3Rpb25Db250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQud2lkdGgoMCk7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0T2Zmc2V0ID0gbXMuaW5wdXQub2Zmc2V0KCkubGVmdCAtIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0O1xuICAgICAgICAgICAgICAgICAgICB3ID0gbXMuY29udGFpbmVyLndpZHRoKCkgLSBpbnB1dE9mZnNldCAtIDQyO1xuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC53aWR0aCh3KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZWxlY3QgYW4gaXRlbSBlaXRoZXIgdGhyb3VnaCBrZXlib2FyZCBvciBtb3VzZVxuICAgICAgICAgICAgICogQHBhcmFtIGl0ZW1cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9zZWxlY3RJdGVtOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYoY2ZnLm1heFNlbGVjdGlvbiA9PT0gMSl7XG4gICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKCdqc29uJykpO1xuICAgICAgICAgICAgICAgIGl0ZW0ucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzID09PSBmYWxzZSB8fCBfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKCFfaGFzRm9jdXMpe1xuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihfaGFzRm9jdXMgJiYgKGNmZy5leHBhbmRPbkZvY3VzIHx8IF9jdHJsRG93bikpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoX2N0cmxEb3duKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTb3J0cyB0aGUgcmVzdWx0cyBhbmQgY3V0IHRoZW0gZG93biB0byBtYXggIyBvZiBkaXNwbGF5ZWQgcmVzdWx0cyBhdCBvbmNlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfc29ydEFuZFRyaW06IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcSA9IG1zLmdldFJhd1ZhbHVlKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gW10sXG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gW10sXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzID0gbXMuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgdGhlIGRhdGEgYWNjb3JkaW5nIHRvIGdpdmVuIGlucHV0XG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG9ialtjZmcuZGlzcGxheUZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChjZmcubWF0Y2hDYXNlID09PSB0cnVlICYmIG5hbWUuaW5kZXhPZihxKSA+IC0xKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjZmcubWF0Y2hDYXNlID09PSBmYWxzZSAmJiBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpID4gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnN0cmljdFN1Z2dlc3QgPT09IGZhbHNlIHx8IG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQucHVzaChvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IGRhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRha2Ugb3V0IHRoZSBvbmVzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAkLmVhY2goZmlsdGVyZWQsIGZ1bmN0aW9uKGluZGV4LCBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5hbGxvd0R1cGxpY2F0ZXMgfHwgJC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sIHNlbGVjdGVkVmFsdWVzKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNvcnQgdGhlIGRhdGFcbiAgICAgICAgICAgICAgICBpZihjZmcuc29ydE9yZGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdIDwgYltjZmcuc29ydE9yZGVyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAtMSA6IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdID4gYltjZmcuc29ydE9yZGVyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAxIDogLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRyaW0gaXQgZG93blxuICAgICAgICAgICAgICAgIGlmKGNmZy5tYXhTdWdnZXN0aW9ucyAmJiBjZmcubWF4U3VnZ2VzdGlvbnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gbmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCwgY2ZnLm1heFN1Z2dlc3Rpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ld1N1Z2dlc3Rpb25zO1xuXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfZ3JvdXA6IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgIC8vIGJ1aWxkIGdyb3Vwc1xuICAgICAgICAgICAgICAgIGlmKGNmZy5ncm91cEJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIF9ncm91cHMgPSB7fTtcblxuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcHMgPSBjZmcuZ3JvdXBCeS5pbmRleE9mKCcuJykgPiAtMSA/IGNmZy5ncm91cEJ5LnNwbGl0KCcuJykgOiBjZmcuZ3JvdXBCeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wID0gdmFsdWVbY2ZnLmdyb3VwQnldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKHByb3BzKSAhPSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKHByb3BzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcFtwcm9wcy5zaGlmdCgpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfZ3JvdXBzW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdID0ge3RpdGxlOiBwcm9wLCBpdGVtczogW3ZhbHVlXX07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFVwZGF0ZSB0aGUgaGVscGVyIHRleHRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF91cGRhdGVIZWxwZXI6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaHRtbChodG1sKTtcbiAgICAgICAgICAgICAgICBpZighbXMuaGVscGVyLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmZhZGVJbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmFsaWRhdGUgYW4gaXRlbSBhZ2FpbnN0IHZ0eXBlIG9yIHZyZWdleFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3ZhbGlkYXRlU2luZ2xlSXRlbTogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIGlmKGNmZy52cmVnZXggIT09IG51bGwgJiYgY2ZnLnZyZWdleCBpbnN0YW5jZW9mIFJlZ0V4cCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjZmcudnR5cGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGNmZy52dHlwZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdhbHBoYSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eW2EtekEtWl9dKyQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FscGhhbnVtJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15bYS16QS1aMC05X10rJC8pLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZW1haWwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXihcXHcrKShbXFwtKy5dW1xcd10rKSpAKFxcd1tcXC1cXHddKlxcLil7MSw1fShbQS1aYS16XSl7Miw2fSQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC8oKCheaHR0cHM/KXwoXmZ0cCkpOlxcL1xcLyhbXFwtXFx3XStcXC4pK1xcd3syLDN9KFxcL1slXFwtXFx3XSsoXFwuXFx3ezIsfSk/KSooKFtcXHdcXC1cXC5cXD9cXFxcXFwvK0AmIztgfj0lIV0qKShcXC5cXHd7Mix9KT8pKlxcLz8pL2kpLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaXBhZGRyZXNzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaGFuZGxlcnMgPSB7XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGJsdXJyaW5nIG91dCBvZiB0aGUgY29tcG9uZW50XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25CbHVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ21zLWN0bi1mb2N1cycpO1xuICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgX2hhc0ZvY3VzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYobXMuZ2V0UmF3VmFsdWUoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgICAgICAgICAgICAgIG9ialtjZmcuZGlzcGxheUZpZWxkXSA9IG9ialtjZmcudmFsdWVGaWVsZF0gPSBtcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG5cbiAgICAgICAgICAgICAgICBpZihtcy5pc1ZhbGlkKCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZWxzZSBpZihtcy5pbnB1dC52YWwoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcignJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignYmx1cicsIFttc10pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBob3ZlcmluZyBhbiBlbGVtZW50IGluIHRoZSBjb21ib1xuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbU1vdXNlT3ZlcjogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICAgICAgaWYoIXRhcmdldC5oYXNDbGFzcygnbXMtcmVzLWl0ZW0tZGlzYWJsZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYW4gaXRlbSBpcyBjaG9zZW4gZnJvbSB0aGUgbGlzdFxuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbVNlbGVjdGVkOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgICAgICBpZighdGFyZ2V0Lmhhc0NsYXNzKCdtcy1yZXMtaXRlbS1kaXNhYmxlZCcpKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gZm9jdXNpbmcgb24gdGhlIGNvbnRhaW5lciBkaXYuIFdpbGwgZm9jdXMgb24gdGhlIGlucHV0IGZpZWxkIGluc3RlYWQuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25Gb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgb24gdGhlIGlucHV0IHRleHQgZmllbGRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbklucHV0Q2xpY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgX2hhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcudG9nZ2xlT25DbGljayA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5leHBhbmRlZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGZvY3VzaW5nIG9uIHRoZSBpbnB1dCB0ZXh0IGZpZWxkLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uSW5wdXRGb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhX2hhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIF9oYXNGb2N1cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWZvY3VzJyk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKGN1ckxlbmd0aCA8IGNmZy5taW5DaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignZm9jdXMnLCBbbXNdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSB1c2VyIHByZXNzZXMgYSBrZXkgd2hpbGUgdGhlIGNvbXBvbmVudCBoYXMgZm9jdXNcbiAgICAgICAgICAgICAqIFRoaXMgaXMgd2hlcmUgd2Ugd2FudCB0byBoYW5kbGUgYWxsIGtleXMgdGhhdCBkb24ndCByZXF1aXJlIHRoZSB1c2VyIGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgKiBzaW5jZSBpdCBoYXNuJ3QgcmVnaXN0ZXJlZCB0aGUga2V5IGhpdCB5ZXRcbiAgICAgICAgICAgICAqIEBwYXJhbSBlIGtleUV2ZW50XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25LZXlEb3duOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaG93IHRhYiBzaG91bGQgYmUgaGFuZGxlZFxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmUgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0JyksXG4gICAgICAgICAgICAgICAgICAgIGZyZWVJbnB1dCA9IG1zLmlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleWRvd24nLCBbbXMsIGVdKTtcblxuICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuVEFCICYmIChjZmcudXNlVGFiS2V5ID09PSBmYWxzZSB8fFxuICAgICAgICAgICAgICAgICAgICAoY2ZnLnVzZVRhYktleSA9PT0gdHJ1ZSAmJiBhY3RpdmUubGVuZ3RoID09PSAwICYmIG1zLmlucHV0LnZhbCgpLmxlbmd0aCA9PT0gMCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQkFDS1NQQUNFOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRTZWxlY3Rpb24oKS5sZW5ndGggPiAwICYmIGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24ucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW21zLCBtcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiBtcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVTQzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVOVEVSOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0ICE9PSAnJyB8fCBjZmcuZXhwYW5kZWQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnVzZUNvbW1hS2V5ID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DVFJMOlxuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkRPV05BUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX21vdmVTZWxlY3RlZFJvdyhcImRvd25cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5VUEFSUk9XOlxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBhIGtleSBpcyByZWxlYXNlZCB3aGlsZSB0aGUgY29tcG9uZW50IGhhcyBmb2N1c1xuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbktleVVwOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZyZWVJbnB1dCA9IG1zLmdldFJhd1ZhbHVlKCksXG4gICAgICAgICAgICAgICAgICAgIGlucHV0VmFsaWQgPSAkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICghY2ZnLm1heEVudHJ5TGVuZ3RoIHx8ICQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoIDw9IGNmZy5tYXhFbnRyeUxlbmd0aCksXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLFxuICAgICAgICAgICAgICAgICAgICBvYmogPSB7fTtcblxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleXVwJywgW21zLCBlXSk7XG5cbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RpbWVyKTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbGxhcHNlIGlmIGVzY2FwZSwgYnV0IGtlZXAgZm9jdXMuXG4gICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5FU0MgJiYgY2ZnLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIGEgYnVuY2ggb2Yga2V5c1xuICAgICAgICAgICAgICAgIGlmKChlLmtleUNvZGUgPT09IEtFWUNPREVTLlRBQiAmJiBjZmcudXNlVGFiS2V5ID09PSBmYWxzZSkgfHwgKGUua2V5Q29kZSA+IEtFWUNPREVTLkVOVEVSICYmIGUua2V5Q29kZSA8IEtFWUNPREVTLlNQQUNFKSkge1xuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLkNUUkwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVVBBUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRU5URVI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgIT09IEtFWUNPREVTLkNPTU1BIHx8IGNmZy51c2VDb21tYUtleSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKXsgLy8gaWYgYSBzZWxlY3Rpb24gaXMgcGVyZm9ybWVkLCBzZWxlY3QgaXQgYW5kIHJlc2V0IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VsZWN0ZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIG5vIHNlbGVjdGlvbiBvciBpZiBmcmVldGV4dCBlbnRlcmVkIGFuZCBmcmVlIGVudHJpZXMgYWxsb3dlZCwgYWRkIG5ldyBvYmogdG8gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpbnB1dFZhbGlkID09PSB0cnVlICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2NmZy5kaXNwbGF5RmllbGRdID0gb2JqW2NmZy52YWx1ZUZpZWxkXSA9IGZyZWVJbnB1dC50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpOyAvLyByZXNldCBjb21ibyBzdWdnZXN0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA8IGNmZy5taW5DaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBmcmVlSW5wdXQubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGNmZy5tYXhFbnRyeUxlbmd0aCAmJiBmcmVlSW5wdXQubGVuZ3RoID4gY2ZnLm1heEVudHJ5TGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4RW50cnlSZW5kZXJlci5jYWxsKHRoaXMsIGZyZWVJbnB1dC5sZW5ndGggLSBjZmcubWF4RW50cnlMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcubWluQ2hhcnMgPD0gZnJlZUlucHV0Lmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBjZmcudHlwZURlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgdXBvbiBjcm9zcyBmb3IgZGVsZXRpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25UYWdUcmlnZ2VyQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBtcy5yZW1vdmVGcm9tU2VsZWN0aW9uKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCdqc29uJykpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyBvbiB0aGUgc21hbGwgdHJpZ2dlciBpbiB0aGUgcmlnaHRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vblRyaWdnZXJDbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhKGNmZy5leHBhbmRPbkZvY3VzID09PSB0cnVlICYmIF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCd0cmlnZ2VyY2xpY2snLCBbbXNdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY3VyTGVuZ3RoID49IGNmZy5taW5DaGFycyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSBicm93c2VyIHdpbmRvdyBpcyByZXNpemVkXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25XaW5kb3dSZXNpemVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzdGFydHVwIHBvaW50XG4gICAgICAgIGlmKGVsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNlbGYuX3JlbmRlcihlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmZuLm1hZ2ljU3VnZ2VzdCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG9iaiA9ICQodGhpcyk7XG5cbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSAmJiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0JykpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBvYmouZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAvLyBhc3N1bWUgJCh0aGlzKSBpcyBhbiBlbGVtZW50XG4gICAgICAgICAgICB2YXIgY250ciA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFJldHVybiBlYXJseSBpZiB0aGlzIGVsZW1lbnQgYWxyZWFkeSBoYXMgYSBwbHVnaW4gaW5zdGFuY2VcbiAgICAgICAgICAgIGlmKGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0Jykpe1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0Jyl7IC8vIHJlbmRlcmluZyBmcm9tIHNlbGVjdFxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMudmFsdWUgPSBbXTtcbiAgICAgICAgICAgICAgICAkLmVhY2godGhpcy5jaGlsZHJlbiwgZnVuY3Rpb24oaW5kZXgsIGNoaWxkKXtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2hpbGQubm9kZU5hbWUgJiYgY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ29wdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhLnB1c2goe2lkOiBjaGlsZC52YWx1ZSwgbmFtZTogY2hpbGQudGV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoJChjaGlsZCkuYXR0cignc2VsZWN0ZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZGVmID0ge307XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVzIGZyb20gRE9NIGNvbnRhaW5lciBlbGVtZW50XG4gICAgICAgICAgICAkLmVhY2godGhpcy5hdHRyaWJ1dGVzLCBmdW5jdGlvbihpLCBhdHQpe1xuICAgICAgICAgICAgICAgIGRlZlthdHQubmFtZV0gPSBhdHQubmFtZSA9PT0gJ3ZhbHVlJyAmJiBhdHQudmFsdWUgIT09ICcnID8gSlNPTi5wYXJzZShhdHQudmFsdWUpIDogYXR0LnZhbHVlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBmaWVsZCA9IG5ldyBNYWdpY1N1Z2dlc3QodGhpcywgJC5leHRlbmQoW10sICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLCBvcHRpb25zLCBkZWYpKTtcbiAgICAgICAgICAgIGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0JywgZmllbGQpO1xuICAgICAgICAgICAgZmllbGQuY29udGFpbmVyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcsIGZpZWxkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG5cbiAgICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzID0ge307XG59KShqUXVlcnkpO1xuIl19
