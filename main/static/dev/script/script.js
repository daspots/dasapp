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
    return $('html.post-create').each(function() {
      return init_resource_upload();
    });
  });

  $(function() {
    return $('html.recommender-create').each(function() {
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
//(function webpackUniversalModuleDefinition(root,factory){if(typeof exports==="object"&&typeof module==="object")module.exports=factory();else if(typeof define==="function"&&define.amd)define("Gifffer",[],factory);else if(typeof exports==="object")exports["Gifffer"]=factory();else root["Gifffer"]=factory()})(this,function(){var d=document;var playSize=60;var Gifffer=function(options){var images,i=0,gifs=[];images=d.querySelectorAll("[data-gifffer]");for(;i<images.length;++i)process(images[i],gifs,options);return gifs};function formatUnit(v){return v+(v.toString().indexOf("%")>0?"":"px")}function parseStyles(styles){var stylesStr="";for(prop in styles)stylesStr+=prop+":"+styles[prop]+";";return stylesStr}function createContainer(w,h,el,altText,opts){var alt;var con=d.createElement("BUTTON");var cls=el.getAttribute("class");var id=el.getAttribute("id");var playButtonStyles=opts&&opts.playButtonStyles?parseStyles(opts.playButtonStyles):["width:"+playSize+"px","height:"+playSize+"px","border-radius:"+playSize/2+"px","background:rgba(0, 0, 0, 0.3)","position:absolute","top:50%","left:50%","margin:-"+playSize/2+"px"].join(";");var playButtonIconStyles=opts&&opts.playButtonIconStyles?parseStyles(opts.playButtonIconStyles):["width: 0","height: 0","border-top: 14px solid transparent","border-bottom: 14px solid transparent","border-left: 14px solid rgba(0, 0, 0, 0.5)","position: absolute","left: 26px","top: 16px"].join(";");cls?con.setAttribute("class",el.getAttribute("class")):null;id?con.setAttribute("id",el.getAttribute("id")):null;con.setAttribute("style","position:relative;cursor:pointer;background:none;border:none;padding:0;");con.setAttribute("aria-hidden","true");var play=d.createElement("DIV");play.setAttribute("class","gifffer-play-button");play.setAttribute("style",playButtonStyles);var trngl=d.createElement("DIV");trngl.setAttribute("style",playButtonIconStyles);play.appendChild(trngl);if(altText){alt=d.createElement("p");alt.setAttribute("class","gifffer-alt");alt.setAttribute("style","border:0;clip:rect(0 0 0 0);height:1px;overflow:hidden;padding:0;position:absolute;width:1px;");alt.innerText=altText+", image"}con.appendChild(play);el.parentNode.replaceChild(con,el);altText?con.parentNode.insertBefore(alt,con.nextSibling):null;return{c:con,p:play}}function calculatePercentageDim(el,w,h,wOrig,hOrig){var parentDimW=el.parentNode.offsetWidth;var parentDimH=el.parentNode.offsetHeight;var ratio=wOrig/hOrig;if(w.toString().indexOf("%")>0){w=parseInt(w.toString().replace("%",""));w=w/100*parentDimW;h=w/ratio}else if(h.toString().indexOf("%")>0){h=parseInt(h.toString().replace("%",""));h=h/100*parentDimW;w=h/ratio}return{w:w,h:h}}function process(el,gifs,options){var url,con,c,w,h,duration,play,gif,playing=false,cc,isC,durationTimeout,dims,altText;url=el.getAttribute("data-gifffer");w=el.getAttribute("data-gifffer-width");h=el.getAttribute("data-gifffer-height");duration=el.getAttribute("data-gifffer-duration");altText=el.getAttribute("data-gifffer-alt");el.style.display="block";c=document.createElement("canvas");isC=!!(c.getContext&&c.getContext("2d"));if(w&&h&&isC)cc=createContainer(w,h,el,altText,options);el.onload=function(){if(!isC)return;w=w||el.width;h=h||el.height;if(!cc)cc=createContainer(w,h,el,altText,options);con=cc.c;play=cc.p;dims=calculatePercentageDim(con,w,h,el.width,el.height);gifs.push(con);con.addEventListener("click",function(){clearTimeout(durationTimeout);if(!playing){playing=true;gif=document.createElement("IMG");gif.setAttribute("style","width:100%;height:100%;");gif.setAttribute("data-uri",Math.floor(Math.random()*1e5)+1);setTimeout(function(){gif.src=url},0);con.removeChild(play);con.removeChild(c);con.appendChild(gif);if(parseInt(duration)>0){durationTimeout=setTimeout(function(){playing=false;con.appendChild(play);con.removeChild(gif);con.appendChild(c);gif=null},duration)}}else{playing=false;con.appendChild(play);con.removeChild(gif);con.appendChild(c);gif=null}});c.width=dims.w;c.height=dims.h;c.getContext("2d").drawImage(el,0,0,dims.w,dims.h);con.appendChild(c);con.setAttribute("style","position:relative;cursor:pointer;width:"+dims.w+"px;height:"+dims.h+"px;background:none;border:none;padding:0;");c.style.width="100%";c.style.height="100%";if(w.toString().indexOf("%")>0&&h.toString().indexOf("%")>0){con.style.width=w;con.style.height=h}else if(w.toString().indexOf("%")>0){con.style.width=w;con.style.height="inherit"}else if(h.toString().indexOf("%")>0){con.style.width="inherit";con.style.height=h}else{con.style.width=dims.w+"px";con.style.height=dims.h+"px"}};el.src=url}return Gifffer});

// Following code adds typeahead keywords to search bars

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

$('#search_page').typeahead(null, {
     minlength: 1,
     name: 'keywords',
     displayKey: 'name',
     valueKey: 'name',
     source: keywords.ttAdapter()
});



$('#keywords').tagsinput({
    confirmKeys: [13, 44],
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

$('#location_keywords').tagsinput({
    confirmKeys: [13, 44],
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

$('.draaiknopje').click(function () {
	setTimeout(function() {
		$('.grid').masonry('layout');
	}, 100);
});

window.onload = function() {
  Gifffer({
      playButtonStyles: {
        'width': '60px',
        'height': '60px',
        'border-radius': '30px',
        'background': 'rgba(0, 0, 0, 0.3)',
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'margin': '-30px 0 0 -30px'
      },
      playButtonIconStyles: {
        'width': '0',
        'height': '0',
        'border-top': '14px solid transparent',
        'border-bottom': '14px solid transparent',
        'border-left': '14px solid rgba(255,255,255, 0.5)',
        'position': 'absolute',
        'left': '26px',
        'top': '16px'
      }
    });








/*!
 * Masonry PACKAGED v4.2.0
 * Cascading grid layout library
 * http://masonry.desandro.com
 * MIT License
 * by David DeSandro
 */

!function(t,e){"function"==typeof define&&define.amd?define("jquery-bridget/jquery-bridget",["jquery"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("jquery")):t.jQueryBridget=e(t,t.jQuery)}(window,function(t,e){"use strict";function i(i,r,a){function h(t,e,n){var o,r="$()."+i+'("'+e+'")';return t.each(function(t,h){var u=a.data(h,i);if(!u)return void s(i+" not initialized. Cannot call methods, i.e. "+r);var d=u[e];if(!d||"_"==e.charAt(0))return void s(r+" is not a valid method");var l=d.apply(u,n);o=void 0===o?l:o}),void 0!==o?o:t}function u(t,e){t.each(function(t,n){var o=a.data(n,i);o?(o.option(e),o._init()):(o=new r(n,e),a.data(n,i,o))})}a=a||e||t.jQuery,a&&(r.prototype.option||(r.prototype.option=function(t){a.isPlainObject(t)&&(this.options=a.extend(!0,this.options,t))}),a.fn[i]=function(t){if("string"==typeof t){var e=o.call(arguments,1);return h(this,t,e)}return u(this,t),this},n(a))}function n(t){!t||t&&t.bridget||(t.bridget=i)}var o=Array.prototype.slice,r=t.console,s="undefined"==typeof r?function(){}:function(t){r.error(t)};return n(e||t.jQuery),i}),function(t,e){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",e):"object"==typeof module&&module.exports?module.exports=e():t.EvEmitter=e()}("undefined"!=typeof window?window:this,function(){function t(){}var e=t.prototype;return e.on=function(t,e){if(t&&e){var i=this._events=this._events||{},n=i[t]=i[t]||[];return-1==n.indexOf(e)&&n.push(e),this}},e.once=function(t,e){if(t&&e){this.on(t,e);var i=this._onceEvents=this._onceEvents||{},n=i[t]=i[t]||{};return n[e]=!0,this}},e.off=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=i.indexOf(e);return-1!=n&&i.splice(n,1),this}},e.emitEvent=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=0,o=i[n];e=e||[];for(var r=this._onceEvents&&this._onceEvents[t];o;){var s=r&&r[o];s&&(this.off(t,o),delete r[o]),o.apply(this,e),n+=s?0:1,o=i[n]}return this}},t}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("get-size/get-size",[],function(){return e()}):"object"==typeof module&&module.exports?module.exports=e():t.getSize=e()}(window,function(){"use strict";function t(t){var e=parseFloat(t),i=-1==t.indexOf("%")&&!isNaN(e);return i&&e}function e(){}function i(){for(var t={width:0,height:0,innerWidth:0,innerHeight:0,outerWidth:0,outerHeight:0},e=0;u>e;e++){var i=h[e];t[i]=0}return t}function n(t){var e=getComputedStyle(t);return e||a("Style returned "+e+". Are you running this code in a hidden iframe on Firefox? See http://bit.ly/getsizebug1"),e}function o(){if(!d){d=!0;var e=document.createElement("div");e.style.width="200px",e.style.padding="1px 2px 3px 4px",e.style.borderStyle="solid",e.style.borderWidth="1px 2px 3px 4px",e.style.boxSizing="border-box";var i=document.body||document.documentElement;i.appendChild(e);var o=n(e);r.isBoxSizeOuter=s=200==t(o.width),i.removeChild(e)}}function r(e){if(o(),"string"==typeof e&&(e=document.querySelector(e)),e&&"object"==typeof e&&e.nodeType){var r=n(e);if("none"==r.display)return i();var a={};a.width=e.offsetWidth,a.height=e.offsetHeight;for(var d=a.isBorderBox="border-box"==r.boxSizing,l=0;u>l;l++){var c=h[l],f=r[c],m=parseFloat(f);a[c]=isNaN(m)?0:m}var p=a.paddingLeft+a.paddingRight,g=a.paddingTop+a.paddingBottom,y=a.marginLeft+a.marginRight,v=a.marginTop+a.marginBottom,_=a.borderLeftWidth+a.borderRightWidth,z=a.borderTopWidth+a.borderBottomWidth,E=d&&s,b=t(r.width);b!==!1&&(a.width=b+(E?0:p+_));var x=t(r.height);return x!==!1&&(a.height=x+(E?0:g+z)),a.innerWidth=a.width-(p+_),a.innerHeight=a.height-(g+z),a.outerWidth=a.width+y,a.outerHeight=a.height+v,a}}var s,a="undefined"==typeof console?e:function(t){console.error(t)},h=["paddingLeft","paddingRight","paddingTop","paddingBottom","marginLeft","marginRight","marginTop","marginBottom","borderLeftWidth","borderRightWidth","borderTopWidth","borderBottomWidth"],u=h.length,d=!1;return r}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("desandro-matches-selector/matches-selector",e):"object"==typeof module&&module.exports?module.exports=e():t.matchesSelector=e()}(window,function(){"use strict";var t=function(){var t=window.Element.prototype;if(t.matches)return"matches";if(t.matchesSelector)return"matchesSelector";for(var e=["webkit","moz","ms","o"],i=0;i<e.length;i++){var n=e[i],o=n+"MatchesSelector";if(t[o])return o}}();return function(e,i){return e[t](i)}}),function(t,e){"function"==typeof define&&define.amd?define("fizzy-ui-utils/utils",["desandro-matches-selector/matches-selector"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("desandro-matches-selector")):t.fizzyUIUtils=e(t,t.matchesSelector)}(window,function(t,e){var i={};i.extend=function(t,e){for(var i in e)t[i]=e[i];return t},i.modulo=function(t,e){return(t%e+e)%e},i.makeArray=function(t){var e=[];if(Array.isArray(t))e=t;else if(t&&"object"==typeof t&&"number"==typeof t.length)for(var i=0;i<t.length;i++)e.push(t[i]);else e.push(t);return e},i.removeFrom=function(t,e){var i=t.indexOf(e);-1!=i&&t.splice(i,1)},i.getParent=function(t,i){for(;t!=document.body;)if(t=t.parentNode,e(t,i))return t},i.getQueryElement=function(t){return"string"==typeof t?document.querySelector(t):t},i.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},i.filterFindElements=function(t,n){t=i.makeArray(t);var o=[];return t.forEach(function(t){if(t instanceof HTMLElement){if(!n)return void o.push(t);e(t,n)&&o.push(t);for(var i=t.querySelectorAll(n),r=0;r<i.length;r++)o.push(i[r])}}),o},i.debounceMethod=function(t,e,i){var n=t.prototype[e],o=e+"Timeout";t.prototype[e]=function(){var t=this[o];t&&clearTimeout(t);var e=arguments,r=this;this[o]=setTimeout(function(){n.apply(r,e),delete r[o]},i||100)}},i.docReady=function(t){var e=document.readyState;"complete"==e||"interactive"==e?setTimeout(t):document.addEventListener("DOMContentLoaded",t)},i.toDashed=function(t){return t.replace(/(.)([A-Z])/g,function(t,e,i){return e+"-"+i}).toLowerCase()};var n=t.console;return i.htmlInit=function(e,o){i.docReady(function(){var r=i.toDashed(o),s="data-"+r,a=document.querySelectorAll("["+s+"]"),h=document.querySelectorAll(".js-"+r),u=i.makeArray(a).concat(i.makeArray(h)),d=s+"-options",l=t.jQuery;u.forEach(function(t){var i,r=t.getAttribute(s)||t.getAttribute(d);try{i=r&&JSON.parse(r)}catch(a){return void(n&&n.error("Error parsing "+s+" on "+t.className+": "+a))}var h=new e(t,i);l&&l.data(t,o,h)})})},i}),function(t,e){"function"==typeof define&&define.amd?define("outlayer/item",["ev-emitter/ev-emitter","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("ev-emitter"),require("get-size")):(t.Outlayer={},t.Outlayer.Item=e(t.EvEmitter,t.getSize))}(window,function(t,e){"use strict";function i(t){for(var e in t)return!1;return e=null,!0}function n(t,e){t&&(this.element=t,this.layout=e,this.position={x:0,y:0},this._create())}function o(t){return t.replace(/([A-Z])/g,function(t){return"-"+t.toLowerCase()})}var r=document.documentElement.style,s="string"==typeof r.transition?"transition":"WebkitTransition",a="string"==typeof r.transform?"transform":"WebkitTransform",h={WebkitTransition:"webkitTransitionEnd",transition:"transitionend"}[s],u={transform:a,transition:s,transitionDuration:s+"Duration",transitionProperty:s+"Property",transitionDelay:s+"Delay"},d=n.prototype=Object.create(t.prototype);d.constructor=n,d._create=function(){this._transn={ingProperties:{},clean:{},onEnd:{}},this.css({position:"absolute"})},d.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},d.getSize=function(){this.size=e(this.element)},d.css=function(t){var e=this.element.style;for(var i in t){var n=u[i]||i;e[n]=t[i]}},d.getPosition=function(){var t=getComputedStyle(this.element),e=this.layout._getOption("originLeft"),i=this.layout._getOption("originTop"),n=t[e?"left":"right"],o=t[i?"top":"bottom"],r=this.layout.size,s=-1!=n.indexOf("%")?parseFloat(n)/100*r.width:parseInt(n,10),a=-1!=o.indexOf("%")?parseFloat(o)/100*r.height:parseInt(o,10);s=isNaN(s)?0:s,a=isNaN(a)?0:a,s-=e?r.paddingLeft:r.paddingRight,a-=i?r.paddingTop:r.paddingBottom,this.position.x=s,this.position.y=a},d.layoutPosition=function(){var t=this.layout.size,e={},i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop"),o=i?"paddingLeft":"paddingRight",r=i?"left":"right",s=i?"right":"left",a=this.position.x+t[o];e[r]=this.getXValue(a),e[s]="";var h=n?"paddingTop":"paddingBottom",u=n?"top":"bottom",d=n?"bottom":"top",l=this.position.y+t[h];e[u]=this.getYValue(l),e[d]="",this.css(e),this.emitEvent("layout",[this])},d.getXValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&!e?t/this.layout.size.width*100+"%":t+"px"},d.getYValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&e?t/this.layout.size.height*100+"%":t+"px"},d._transitionTo=function(t,e){this.getPosition();var i=this.position.x,n=this.position.y,o=parseInt(t,10),r=parseInt(e,10),s=o===this.position.x&&r===this.position.y;if(this.setPosition(t,e),s&&!this.isTransitioning)return void this.layoutPosition();var a=t-i,h=e-n,u={};u.transform=this.getTranslate(a,h),this.transition({to:u,onTransitionEnd:{transform:this.layoutPosition},isCleaning:!0})},d.getTranslate=function(t,e){var i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop");return t=i?t:-t,e=n?e:-e,"translate3d("+t+"px, "+e+"px, 0)"},d.goTo=function(t,e){this.setPosition(t,e),this.layoutPosition()},d.moveTo=d._transitionTo,d.setPosition=function(t,e){this.position.x=parseInt(t,10),this.position.y=parseInt(e,10)},d._nonTransition=function(t){this.css(t.to),t.isCleaning&&this._removeStyles(t.to);for(var e in t.onTransitionEnd)t.onTransitionEnd[e].call(this)},d.transition=function(t){if(!parseFloat(this.layout.options.transitionDuration))return void this._nonTransition(t);var e=this._transn;for(var i in t.onTransitionEnd)e.onEnd[i]=t.onTransitionEnd[i];for(i in t.to)e.ingProperties[i]=!0,t.isCleaning&&(e.clean[i]=!0);if(t.from){this.css(t.from);var n=this.element.offsetHeight;n=null}this.enableTransition(t.to),this.css(t.to),this.isTransitioning=!0};var l="opacity,"+o(a);d.enableTransition=function(){if(!this.isTransitioning){var t=this.layout.options.transitionDuration;t="number"==typeof t?t+"ms":t,this.css({transitionProperty:l,transitionDuration:t,transitionDelay:this.staggerDelay||0}),this.element.addEventListener(h,this,!1)}},d.onwebkitTransitionEnd=function(t){this.ontransitionend(t)},d.onotransitionend=function(t){this.ontransitionend(t)};var c={"-webkit-transform":"transform"};d.ontransitionend=function(t){if(t.target===this.element){var e=this._transn,n=c[t.propertyName]||t.propertyName;if(delete e.ingProperties[n],i(e.ingProperties)&&this.disableTransition(),n in e.clean&&(this.element.style[t.propertyName]="",delete e.clean[n]),n in e.onEnd){var o=e.onEnd[n];o.call(this),delete e.onEnd[n]}this.emitEvent("transitionEnd",[this])}},d.disableTransition=function(){this.removeTransitionStyles(),this.element.removeEventListener(h,this,!1),this.isTransitioning=!1},d._removeStyles=function(t){var e={};for(var i in t)e[i]="";this.css(e)};var f={transitionProperty:"",transitionDuration:"",transitionDelay:""};return d.removeTransitionStyles=function(){this.css(f)},d.stagger=function(t){t=isNaN(t)?0:t,this.staggerDelay=t+"ms"},d.removeElem=function(){this.element.parentNode.removeChild(this.element),this.css({display:""}),this.emitEvent("remove",[this])},d.remove=function(){return s&&parseFloat(this.layout.options.transitionDuration)?(this.once("transitionEnd",function(){this.removeElem()}),void this.hide()):void this.removeElem()},d.reveal=function(){delete this.isHidden,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("visibleStyle");e[i]=this.onRevealTransitionEnd,this.transition({from:t.hiddenStyle,to:t.visibleStyle,isCleaning:!0,onTransitionEnd:e})},d.onRevealTransitionEnd=function(){this.isHidden||this.emitEvent("reveal")},d.getHideRevealTransitionEndProperty=function(t){var e=this.layout.options[t];if(e.opacity)return"opacity";for(var i in e)return i},d.hide=function(){this.isHidden=!0,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("hiddenStyle");e[i]=this.onHideTransitionEnd,this.transition({from:t.visibleStyle,to:t.hiddenStyle,isCleaning:!0,onTransitionEnd:e})},d.onHideTransitionEnd=function(){this.isHidden&&(this.css({display:"none"}),this.emitEvent("hide"))},d.destroy=function(){this.css({position:"",left:"",right:"",top:"",bottom:"",transition:"",transform:""})},n}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("outlayer/outlayer",["ev-emitter/ev-emitter","get-size/get-size","fizzy-ui-utils/utils","./item"],function(i,n,o,r){return e(t,i,n,o,r)}):"object"==typeof module&&module.exports?module.exports=e(t,require("ev-emitter"),require("get-size"),require("fizzy-ui-utils"),require("./item")):t.Outlayer=e(t,t.EvEmitter,t.getSize,t.fizzyUIUtils,t.Outlayer.Item)}(window,function(t,e,i,n,o){"use strict";function r(t,e){var i=n.getQueryElement(t);if(!i)return void(h&&h.error("Bad element for "+this.constructor.namespace+": "+(i||t)));this.element=i,u&&(this.$element=u(this.element)),this.options=n.extend({},this.constructor.defaults),this.option(e);var o=++l;this.element.outlayerGUID=o,c[o]=this,this._create();var r=this._getOption("initLayout");r&&this.layout()}function s(t){function e(){t.apply(this,arguments)}return e.prototype=Object.create(t.prototype),e.prototype.constructor=e,e}function a(t){if("number"==typeof t)return t;var e=t.match(/(^\d*\.?\d*)(\w*)/),i=e&&e[1],n=e&&e[2];if(!i.length)return 0;i=parseFloat(i);var o=m[n]||1;return i*o}var h=t.console,u=t.jQuery,d=function(){},l=0,c={};r.namespace="outlayer",r.Item=o,r.defaults={containerStyle:{position:"relative"},initLayout:!0,originLeft:!0,originTop:!0,resize:!0,resizeContainer:!0,transitionDuration:"0.4s",hiddenStyle:{opacity:0,transform:"scale(0.001)"},visibleStyle:{opacity:1,transform:"scale(1)"}};var f=r.prototype;n.extend(f,e.prototype),f.option=function(t){n.extend(this.options,t)},f._getOption=function(t){var e=this.constructor.compatOptions[t];return e&&void 0!==this.options[e]?this.options[e]:this.options[t]},r.compatOptions={initLayout:"isInitLayout",horizontal:"isHorizontal",layoutInstant:"isLayoutInstant",originLeft:"isOriginLeft",originTop:"isOriginTop",resize:"isResizeBound",resizeContainer:"isResizingContainer"},f._create=function(){this.reloadItems(),this.stamps=[],this.stamp(this.options.stamp),n.extend(this.element.style,this.options.containerStyle);var t=this._getOption("resize");t&&this.bindResize()},f.reloadItems=function(){this.items=this._itemize(this.element.children)},f._itemize=function(t){for(var e=this._filterFindItemElements(t),i=this.constructor.Item,n=[],o=0;o<e.length;o++){var r=e[o],s=new i(r,this);n.push(s)}return n},f._filterFindItemElements=function(t){return n.filterFindElements(t,this.options.itemSelector)},f.getItemElements=function(){return this.items.map(function(t){return t.element})},f.layout=function(){this._resetLayout(),this._manageStamps();var t=this._getOption("layoutInstant"),e=void 0!==t?t:!this._isLayoutInited;this.layoutItems(this.items,e),this._isLayoutInited=!0},f._init=f.layout,f._resetLayout=function(){this.getSize()},f.getSize=function(){this.size=i(this.element)},f._getMeasurement=function(t,e){var n,o=this.options[t];o?("string"==typeof o?n=this.element.querySelector(o):o instanceof HTMLElement&&(n=o),this[t]=n?i(n)[e]:o):this[t]=0},f.layoutItems=function(t,e){t=this._getItemsForLayout(t),this._layoutItems(t,e),this._postLayout()},f._getItemsForLayout=function(t){return t.filter(function(t){return!t.isIgnored})},f._layoutItems=function(t,e){if(this._emitCompleteOnItems("layout",t),t&&t.length){var i=[];t.forEach(function(t){var n=this._getItemLayoutPosition(t);n.item=t,n.isInstant=e||t.isLayoutInstant,i.push(n)},this),this._processLayoutQueue(i)}},f._getItemLayoutPosition=function(){return{x:0,y:0}},f._processLayoutQueue=function(t){this.updateStagger(),t.forEach(function(t,e){this._positionItem(t.item,t.x,t.y,t.isInstant,e)},this)},f.updateStagger=function(){var t=this.options.stagger;return null===t||void 0===t?void(this.stagger=0):(this.stagger=a(t),this.stagger)},f._positionItem=function(t,e,i,n,o){n?t.goTo(e,i):(t.stagger(o*this.stagger),t.moveTo(e,i))},f._postLayout=function(){this.resizeContainer()},f.resizeContainer=function(){var t=this._getOption("resizeContainer");if(t){var e=this._getContainerSize();e&&(this._setContainerMeasure(e.width,!0),this._setContainerMeasure(e.height,!1))}},f._getContainerSize=d,f._setContainerMeasure=function(t,e){if(void 0!==t){var i=this.size;i.isBorderBox&&(t+=e?i.paddingLeft+i.paddingRight+i.borderLeftWidth+i.borderRightWidth:i.paddingBottom+i.paddingTop+i.borderTopWidth+i.borderBottomWidth),t=Math.max(t,0),this.element.style[e?"width":"height"]=t+"px"}},f._emitCompleteOnItems=function(t,e){function i(){o.dispatchEvent(t+"Complete",null,[e])}function n(){s++,s==r&&i()}var o=this,r=e.length;if(!e||!r)return void i();var s=0;e.forEach(function(e){e.once(t,n)})},f.dispatchEvent=function(t,e,i){var n=e?[e].concat(i):i;if(this.emitEvent(t,n),u)if(this.$element=this.$element||u(this.element),e){var o=u.Event(e);o.type=t,this.$element.trigger(o,i)}else this.$element.trigger(t,i)},f.ignore=function(t){var e=this.getItem(t);e&&(e.isIgnored=!0)},f.unignore=function(t){var e=this.getItem(t);e&&delete e.isIgnored},f.stamp=function(t){t=this._find(t),t&&(this.stamps=this.stamps.concat(t),t.forEach(this.ignore,this))},f.unstamp=function(t){t=this._find(t),t&&t.forEach(function(t){n.removeFrom(this.stamps,t),this.unignore(t)},this)},f._find=function(t){return t?("string"==typeof t&&(t=this.element.querySelectorAll(t)),t=n.makeArray(t)):void 0},f._manageStamps=function(){this.stamps&&this.stamps.length&&(this._getBoundingRect(),this.stamps.forEach(this._manageStamp,this))},f._getBoundingRect=function(){var t=this.element.getBoundingClientRect(),e=this.size;this._boundingRect={left:t.left+e.paddingLeft+e.borderLeftWidth,top:t.top+e.paddingTop+e.borderTopWidth,right:t.right-(e.paddingRight+e.borderRightWidth),bottom:t.bottom-(e.paddingBottom+e.borderBottomWidth)}},f._manageStamp=d,f._getElementOffset=function(t){var e=t.getBoundingClientRect(),n=this._boundingRect,o=i(t),r={left:e.left-n.left-o.marginLeft,top:e.top-n.top-o.marginTop,right:n.right-e.right-o.marginRight,bottom:n.bottom-e.bottom-o.marginBottom};return r},f.handleEvent=n.handleEvent,f.bindResize=function(){t.addEventListener("resize",this),this.isResizeBound=!0},f.unbindResize=function(){t.removeEventListener("resize",this),this.isResizeBound=!1},f.onresize=function(){this.resize()},n.debounceMethod(r,"onresize",100),f.resize=function(){this.isResizeBound&&this.needsResizeLayout()&&this.layout()},f.needsResizeLayout=function(){var t=i(this.element),e=this.size&&t;return e&&t.innerWidth!==this.size.innerWidth},f.addItems=function(t){var e=this._itemize(t);return e.length&&(this.items=this.items.concat(e)),e},f.appended=function(t){var e=this.addItems(t);e.length&&(this.layoutItems(e,!0),this.reveal(e))},f.prepended=function(t){var e=this._itemize(t);if(e.length){var i=this.items.slice(0);this.items=e.concat(i),this._resetLayout(),this._manageStamps(),this.layoutItems(e,!0),this.reveal(e),this.layoutItems(i)}},f.reveal=function(t){if(this._emitCompleteOnItems("reveal",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.reveal()})}},f.hide=function(t){if(this._emitCompleteOnItems("hide",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.hide()})}},f.revealItemElements=function(t){var e=this.getItems(t);this.reveal(e)},f.hideItemElements=function(t){var e=this.getItems(t);this.hide(e)},f.getItem=function(t){for(var e=0;e<this.items.length;e++){var i=this.items[e];if(i.element==t)return i}},f.getItems=function(t){t=n.makeArray(t);var e=[];return t.forEach(function(t){var i=this.getItem(t);i&&e.push(i)},this),e},f.remove=function(t){var e=this.getItems(t);this._emitCompleteOnItems("remove",e),e&&e.length&&e.forEach(function(t){t.remove(),n.removeFrom(this.items,t)},this)},f.destroy=function(){var t=this.element.style;t.height="",t.position="",t.width="",this.items.forEach(function(t){t.destroy()}),this.unbindResize();var e=this.element.outlayerGUID;delete c[e],delete this.element.outlayerGUID,u&&u.removeData(this.element,this.constructor.namespace)},r.data=function(t){t=n.getQueryElement(t);var e=t&&t.outlayerGUID;return e&&c[e]},r.create=function(t,e){var i=s(r);return i.defaults=n.extend({},r.defaults),n.extend(i.defaults,e),i.compatOptions=n.extend({},r.compatOptions),i.namespace=t,i.data=r.data,i.Item=s(o),n.htmlInit(i,t),u&&u.bridget&&u.bridget(t,i),i};var m={ms:1,s:1e3};return r.Item=o,r}),function(t,e){"function"==typeof define&&define.amd?define(["outlayer/outlayer","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("outlayer"),require("get-size")):t.Masonry=e(t.Outlayer,t.getSize)}(window,function(t,e){var i=t.create("masonry");i.compatOptions.fitWidth="isFitWidth";var n=i.prototype;return n._resetLayout=function(){this.getSize(),this._getMeasurement("columnWidth","outerWidth"),this._getMeasurement("gutter","outerWidth"),this.measureColumns(),this.colYs=[];for(var t=0;t<this.cols;t++)this.colYs.push(0);this.maxY=0,this.horizontalColIndex=0},n.measureColumns=function(){if(this.getContainerWidth(),!this.columnWidth){var t=this.items[0],i=t&&t.element;this.columnWidth=i&&e(i).outerWidth||this.containerWidth}var n=this.columnWidth+=this.gutter,o=this.containerWidth+this.gutter,r=o/n,s=n-o%n,a=s&&1>s?"round":"floor";r=Math[a](r),this.cols=Math.max(r,1)},n.getContainerWidth=function(){var t=this._getOption("fitWidth"),i=t?this.element.parentNode:this.element,n=e(i);this.containerWidth=n&&n.innerWidth},n._getItemLayoutPosition=function(t){t.getSize();var e=t.size.outerWidth%this.columnWidth,i=e&&1>e?"round":"ceil",n=Math[i](t.size.outerWidth/this.columnWidth);n=Math.min(n,this.cols);for(var o=this.options.horizontalOrder?"_getHorizontalColPosition":"_getTopColPosition",r=this[o](n,t),s={x:this.columnWidth*r.col,y:r.y},a=r.y+t.size.outerHeight,h=n+r.col,u=r.col;h>u;u++)this.colYs[u]=a;return s},n._getTopColPosition=function(t){var e=this._getTopColGroup(t),i=Math.min.apply(Math,e);return{col:e.indexOf(i),y:i}},n._getTopColGroup=function(t){if(2>t)return this.colYs;for(var e=[],i=this.cols+1-t,n=0;i>n;n++)e[n]=this._getColGroupY(n,t);return e},n._getColGroupY=function(t,e){if(2>e)return this.colYs[t];var i=this.colYs.slice(t,t+e);return Math.max.apply(Math,i)},n._getHorizontalColPosition=function(t,e){var i=this.horizontalColIndex%this.cols,n=t>1&&i+t>this.cols;i=n?0:i;var o=e.size.outerWidth&&e.size.outerHeight;return this.horizontalColIndex=o?i+t:this.horizontalColIndex,{col:i,y:this._getColGroupY(i,t)}},n._manageStamp=function(t){var i=e(t),n=this._getElementOffset(t),o=this._getOption("originLeft"),r=o?n.left:n.right,s=r+i.outerWidth,a=Math.floor(r/this.columnWidth);a=Math.max(0,a);var h=Math.floor(s/this.columnWidth);h-=s%this.columnWidth?0:1,h=Math.min(this.cols-1,h);for(var u=this._getOption("originTop"),d=(u?n.top:n.bottom)+i.outerHeight,l=a;h>=l;l++)this.colYs[l]=Math.max(d,this.colYs[l])},n._getContainerSize=function(){this.maxY=Math.max.apply(Math,this.colYs);var t={height:this.maxY};return this._getOption("fitWidth")&&(t.width=this._getContainerFitWidth()),t},n._getContainerFitWidth=function(){for(var t=0,e=this.cols;--e&&0===this.colYs[e];)t++;return(this.cols-t)*this.columnWidth-this.gutter},n.needsResizeLayout=function(){var t=this.containerWidth;return this.getContainerWidth(),t!=this.containerWidth},i});

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImdpZmZmZXIuanMiLCJsb2FkLmpzIiwibWFzb25yeS5wa2dkLm1pbi5qcyIsInN0YXJfY29kZS5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LW1pbi5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsTUFBTSxDQUFDLFFBQVAsR0FBa0IsU0FBQyxNQUFELEVBQVMsR0FBVCxFQUFjLE1BQWQsRUFBc0IsSUFBdEIsRUFBNEIsUUFBNUI7QUFDaEIsUUFBQTtJQUFBLFFBQUEsR0FBVyxRQUFBLElBQVksSUFBWixJQUFvQjtJQUMvQixJQUFBLEdBQU8sSUFBQSxJQUFRO0lBQ2YsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFvQixDQUF2QjtNQUNFLElBQUEsR0FBTyxPQURUOztJQUVBLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBcUIsQ0FBeEI7TUFDRSxNQUFBLEdBQVM7TUFDVCxJQUFBLEdBQU8sT0FGVDs7SUFHQSxNQUFBLEdBQVMsTUFBQSxJQUFVO0FBQ25CLFNBQUEsV0FBQTs7TUFDRSxJQUF3QixTQUF4QjtRQUFBLE9BQU8sTUFBTyxDQUFBLENBQUEsRUFBZDs7QUFERjtJQUVBLFNBQUEsR0FBZSxHQUFHLENBQUMsTUFBSixDQUFXLEtBQVgsQ0FBQSxJQUFxQixDQUF4QixHQUErQixHQUEvQixHQUF3QztXQUNwRCxDQUFDLENBQUMsSUFBRixDQUNFO01BQUEs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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LmFwaV9jYWxsID0gKG1ldGhvZCwgdXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZGF0YSB8fCBwYXJhbXNcclxuICBkYXRhID0gZGF0YSB8fCBwYXJhbXNcclxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09IDRcclxuICAgIGRhdGEgPSB1bmRlZmluZWRcclxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09ICAzXHJcbiAgICBwYXJhbXMgPSB1bmRlZmluZWRcclxuICAgIGRhdGEgPSB1bmRlZmluZWRcclxuICBwYXJhbXMgPSBwYXJhbXMgfHwge31cclxuICBmb3IgaywgdiBvZiBwYXJhbXNcclxuICAgIGRlbGV0ZSBwYXJhbXNba10gaWYgbm90IHY/XHJcbiAgc2VwYXJhdG9yID0gaWYgdXJsLnNlYXJjaCgnXFxcXD8nKSA+PSAwIHRoZW4gJyYnIGVsc2UgJz8nXHJcbiAgJC5hamF4XHJcbiAgICB0eXBlOiBtZXRob2RcclxuICAgIHVybDogXCIje3VybH0je3NlcGFyYXRvcn0jeyQucGFyYW0gcGFyYW1zfVwiXHJcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICBhY2NlcHRzOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgIGRhdGE6IGlmIGRhdGEgdGhlbiBKU09OLnN0cmluZ2lmeShkYXRhKSBlbHNlIHVuZGVmaW5lZFxyXG4gICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgIGlmIGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJ1xyXG4gICAgICAgIG1vcmUgPSB1bmRlZmluZWRcclxuICAgICAgICBpZiBkYXRhLm5leHRfdXJsXHJcbiAgICAgICAgICBtb3JlID0gKGNhbGxiYWNrKSAtPiBhcGlfY2FsbChtZXRob2QsIGRhdGEubmV4dF91cmwsIHt9LCBjYWxsYmFjaylcclxuICAgICAgICBjYWxsYmFjaz8gdW5kZWZpbmVkLCBkYXRhLnJlc3VsdCwgbW9yZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2s/IGRhdGFcclxuICAgIGVycm9yOiAoanFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSAtPlxyXG4gICAgICBlcnJvciA9XHJcbiAgICAgICAgZXJyb3JfY29kZTogJ2FqYXhfZXJyb3InXHJcbiAgICAgICAgdGV4dF9zdGF0dXM6IHRleHRTdGF0dXNcclxuICAgICAgICBlcnJvcl90aHJvd246IGVycm9yVGhyb3duXHJcbiAgICAgICAganFYSFI6IGpxWEhSXHJcbiAgICAgIHRyeVxyXG4gICAgICAgIGVycm9yID0gJC5wYXJzZUpTT04oanFYSFIucmVzcG9uc2VUZXh0KSBpZiBqcVhIUi5yZXNwb25zZVRleHRcclxuICAgICAgY2F0Y2ggZVxyXG4gICAgICAgIGVycm9yID0gZXJyb3JcclxuICAgICAgTE9HICdhcGlfY2FsbCBlcnJvcicsIGVycm9yXHJcbiAgICAgIGNhbGxiYWNrPyBlcnJvclxyXG4iLCIoLT5cclxuICBjbGFzcyB3aW5kb3cuRmlsZVVwbG9hZGVyXHJcbiAgICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zKSAtPlxyXG4gICAgICBAdXBsb2FkX2hhbmRsZXIgPSBAb3B0aW9ucy51cGxvYWRfaGFuZGxlclxyXG4gICAgICBAc2VsZWN0b3IgPSBAb3B0aW9ucy5zZWxlY3RvclxyXG4gICAgICBAZHJvcF9hcmVhID0gQG9wdGlvbnMuZHJvcF9hcmVhXHJcbiAgICAgIEB1cGxvYWRfdXJsID0gQG9wdGlvbnMudXBsb2FkX3VybCBvciBcIi9hcGkvdjEje3dpbmRvdy5sb2NhdGlvbi5wYXRobmFtZX1cIlxyXG4gICAgICBAY29uZmlybV9tZXNzYWdlID0gQG9wdGlvbnMuY29uZmlybV9tZXNzYWdlIG9yICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xyXG4gICAgICBAYWxsb3dlZF90eXBlcyA9IEBvcHRpb25zLmFsbG93ZWRfdHlwZXNcclxuICAgICAgQG1heF9zaXplID0gQG9wdGlvbnMubWF4X3NpemVcclxuXHJcbiAgICAgIEBhY3RpdmVfZmlsZXMgPSAwXHJcblxyXG4gICAgICBAc2VsZWN0b3I/LmJpbmQgJ2NoYW5nZScsIChlKSA9PlxyXG4gICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyKGUpXHJcblxyXG4gICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgICBpZiBAZHJvcF9hcmVhPyBhbmQgeGhyLnVwbG9hZFxyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdvdmVyJywgQGZpbGVfZHJhZ19ob3ZlclxyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdsZWF2ZScsIEBmaWxlX2RyYWdfaG92ZXJcclxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcm9wJywgKGUpID0+XHJcbiAgICAgICAgICBAZmlsZV9zZWxlY3RfaGFuZGxlciBlXHJcbiAgICAgICAgQGRyb3BfYXJlYS5zaG93KClcclxuXHJcbiAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ID0+XHJcbiAgICAgICAgaWYgQGNvbmZpcm1fbWVzc2FnZT8gYW5kIEBhY3RpdmVfZmlsZXMgPiAwXHJcbiAgICAgICAgICByZXR1cm4gQGNvbmZpcm1fbWVzc2FnZVxyXG5cclxuICAgIGZpbGVfZHJhZ19ob3ZlcjogKGUpID0+XHJcbiAgICAgIGlmIG5vdCBAZHJvcF9hcmVhP1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBpZiBlLnR5cGUgaXMgJ2RyYWdvdmVyJ1xyXG4gICAgICAgIEBkcm9wX2FyZWEuYWRkQ2xhc3MgJ2RyYWctaG92ZXInXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAZHJvcF9hcmVhLnJlbW92ZUNsYXNzICdkcmFnLWhvdmVyJ1xyXG5cclxuICAgIGZpbGVfc2VsZWN0X2hhbmRsZXI6IChlKSA9PlxyXG4gICAgICBAZmlsZV9kcmFnX2hvdmVyKGUpXHJcbiAgICAgIGZpbGVzID0gZS5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlcj8uZmlsZXMgb3IgZS50YXJnZXQ/LmZpbGVzIG9yIGUuZGF0YVRyYW5zZmVyPy5maWxlc1xyXG4gICAgICBpZiBmaWxlcz8ubGVuZ3RoID4gMFxyXG4gICAgICAgIEB1cGxvYWRfZmlsZXMoZmlsZXMpXHJcblxyXG4gICAgdXBsb2FkX2ZpbGVzOiAoZmlsZXMpID0+XHJcbiAgICAgIEBnZXRfdXBsb2FkX3VybHMgZmlsZXMubGVuZ3RoLCAoZXJyb3IsIHVybHMpID0+XHJcbiAgICAgICAgaWYgZXJyb3JcclxuICAgICAgICAgIGNvbnNvbGUubG9nICdFcnJvciBnZXR0aW5nIFVSTHMnLCBlcnJvclxyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgQHByb2Nlc3NfZmlsZXMgZmlsZXMsIHVybHMsIDBcclxuXHJcbiAgICBnZXRfdXBsb2FkX3VybHM6IChuLCBjYWxsYmFjaykgPT5cclxuICAgICAgcmV0dXJuIGlmIG4gPD0gMFxyXG4gICAgICBhcGlfY2FsbCAnR0VUJywgQHVwbG9hZF91cmwsIHtjb3VudDogbn0sIChlcnJvciwgcmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIGVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJvclxyXG4gICAgICAgICAgdGhyb3cgZXJyb3JcclxuICAgICAgICBjYWxsYmFjayB1bmRlZmluZWQsIHJlc3VsdFxyXG5cclxuICAgIHByb2Nlc3NfZmlsZXM6IChmaWxlcywgdXJscywgaSkgPT5cclxuICAgICAgcmV0dXJuIGlmIGkgPj0gZmlsZXMubGVuZ3RoXHJcbiAgICAgIEB1cGxvYWRfZmlsZSBmaWxlc1tpXSwgdXJsc1tpXS51cGxvYWRfdXJsLCBAdXBsb2FkX2hhbmRsZXI/LnByZXZpZXcoZmlsZXNbaV0pLCAoKSA9PlxyXG4gICAgICAgIEBwcm9jZXNzX2ZpbGVzIGZpbGVzLCB1cmxzLCBpICsgMSwgQHVwbG9hZF9oYW5kbGVyP1xyXG5cclxuICAgIHVwbG9hZF9maWxlOiAoZmlsZSwgdXJsLCBwcm9ncmVzcywgY2FsbGJhY2spID0+XHJcbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgICAgIGlmIEBhbGxvd2VkX3R5cGVzPy5sZW5ndGggPiAwXHJcbiAgICAgICAgaWYgZmlsZS50eXBlIG5vdCBpbiBAYWxsb3dlZF90eXBlc1xyXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnd3JvbmdfdHlwZSdcclxuICAgICAgICAgIGNhbGxiYWNrKClcclxuICAgICAgICAgIHJldHVyblxyXG5cclxuICAgICAgaWYgQG1heF9zaXplP1xyXG4gICAgICAgIGlmIGZpbGUuc2l6ZSA+IEBtYXhfc2l6ZVxyXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAndG9vX2JpZydcclxuICAgICAgICAgIGNhbGxiYWNrKClcclxuICAgICAgICAgIHJldHVyblxyXG5cclxuICAgICAgIyAkKCcjaW1hZ2UnKS52YWwoZmlsZS5uYW1lKTtcclxuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyICdwcm9ncmVzcycsIChldmVudCkgLT5cclxuICAgICAgICBwcm9ncmVzcyBwYXJzZUludCBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCAqIDEwMC4wXHJcblxyXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKGV2ZW50KSA9PlxyXG4gICAgICAgIGlmIHhoci5yZWFkeVN0YXRlID09IDRcclxuICAgICAgICAgIGlmIHhoci5zdGF0dXMgPT0gMjAwXHJcbiAgICAgICAgICAgIHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KVxyXG4gICAgICAgICAgICBwcm9ncmVzcyAxMDAuMCwgcmVzcG9uc2UucmVzdWx0XHJcbiAgICAgICAgICAgICMgLy8kKCcjY29udGVudCcpLnZhbCh4aHIucmVzcG9uc2VUZXh0KVxyXG4gICAgICAgICAgICAkKCcjaW1hZ2UnKS52YWwoJCgnI2ltYWdlJykudmFsKCkgICsgcmVzcG9uc2UucmVzdWx0LmlkICsgJzsnKTtcclxuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ2Vycm9yJ1xyXG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcclxuXHJcbiAgICAgIHhoci5vcGVuICdQT1NUJywgdXJsLCB0cnVlXHJcbiAgICAgIGRhdGEgPSBuZXcgRm9ybURhdGEoKVxyXG4gICAgICBkYXRhLmFwcGVuZCAnZmlsZScsIGZpbGVcclxuICAgICAgeGhyLnNlbmQgZGF0YVxyXG4gICAgICBjYWxsYmFjaygpXHJcbikoKSIsIndpbmRvdy5MT0cgPSAtPlxyXG4gIGNvbnNvbGU/LmxvZz8gYXJndW1lbnRzLi4uXHJcblxyXG5cclxud2luZG93LmluaXRfY29tbW9uID0gLT5cclxuICBpbml0X2xvYWRpbmdfYnV0dG9uKClcclxuICBpbml0X2NvbmZpcm1fYnV0dG9uKClcclxuICBpbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uKClcclxuICBpbml0X3RpbWUoKVxyXG4gIGluaXRfYW5ub3VuY2VtZW50KClcclxuICBpbml0X3Jvd19saW5rKClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9sb2FkaW5nX2J1dHRvbiA9IC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWxvYWRpbmcnLCAtPlxyXG4gICAgJCh0aGlzKS5idXR0b24gJ2xvYWRpbmcnXHJcblxyXG5cclxud2luZG93LmluaXRfY29uZmlybV9idXR0b24gPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1jb25maXJtJywgLT5cclxuICAgIGlmIG5vdCBjb25maXJtICQodGhpcykuZGF0YSgnbWVzc2FnZScpIG9yICdBcmUgeW91IHN1cmU/J1xyXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG5cclxud2luZG93LmluaXRfcGFzc3dvcmRfc2hvd19idXR0b24gPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1wYXNzd29yZC1zaG93JywgLT5cclxuICAgICR0YXJnZXQgPSAkKCQodGhpcykuZGF0YSAndGFyZ2V0JylcclxuICAgICR0YXJnZXQuZm9jdXMoKVxyXG4gICAgaWYgJCh0aGlzKS5oYXNDbGFzcyAnYWN0aXZlJ1xyXG4gICAgICAkdGFyZ2V0LmF0dHIgJ3R5cGUnLCAncGFzc3dvcmQnXHJcbiAgICBlbHNlXHJcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICd0ZXh0J1xyXG5cclxuXHJcbndpbmRvdy5pbml0X3RpbWUgPSAtPlxyXG4gIGlmICQoJ3RpbWUnKS5sZW5ndGggPiAwXHJcbiAgICByZWNhbGN1bGF0ZSA9IC0+XHJcbiAgICAgICQoJ3RpbWVbZGF0ZXRpbWVdJykuZWFjaCAtPlxyXG4gICAgICAgIGRhdGUgPSBtb21lbnQudXRjICQodGhpcykuYXR0ciAnZGF0ZXRpbWUnXHJcbiAgICAgICAgZGlmZiA9IG1vbWVudCgpLmRpZmYgZGF0ZSAsICdkYXlzJ1xyXG4gICAgICAgIGlmIGRpZmYgPiAyNVxyXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUubG9jYWwoKS5mb3JtYXQgJ1lZWVktTU0tREQnXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUuZnJvbU5vdygpXHJcbiAgICAgICAgJCh0aGlzKS5hdHRyICd0aXRsZScsIGRhdGUubG9jYWwoKS5mb3JtYXQgJ2RkZGQsIE1NTU0gRG8gWVlZWSwgSEg6bW06c3MgWidcclxuICAgICAgc2V0VGltZW91dCBhcmd1bWVudHMuY2FsbGVlLCAxMDAwICogNDVcclxuICAgIHJlY2FsY3VsYXRlKClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9hbm5vdW5jZW1lbnQgPSAtPlxyXG4gICQoJy5hbGVydC1hbm5vdW5jZW1lbnQgYnV0dG9uLmNsb3NlJykuY2xpY2sgLT5cclxuICAgIHNlc3Npb25TdG9yYWdlPy5zZXRJdGVtICdjbG9zZWRBbm5vdW5jZW1lbnQnLCAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXHJcblxyXG4gIGlmIHNlc3Npb25TdG9yYWdlPy5nZXRJdGVtKCdjbG9zZWRBbm5vdW5jZW1lbnQnKSAhPSAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXHJcbiAgICAkKCcuYWxlcnQtYW5ub3VuY2VtZW50Jykuc2hvdygpXHJcblxyXG5cclxud2luZG93LmluaXRfcm93X2xpbmsgPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLnJvdy1saW5rJywgLT5cclxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJCh0aGlzKS5kYXRhICdocmVmJ1xyXG5cclxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5ub3QtbGluaycsIChlKSAtPlxyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG5cclxuXHJcbndpbmRvdy5jbGVhcl9ub3RpZmljYXRpb25zID0gLT5cclxuICAkKCcjbm90aWZpY2F0aW9ucycpLmVtcHR5KClcclxuXHJcblxyXG53aW5kb3cuc2hvd19ub3RpZmljYXRpb24gPSAobWVzc2FnZSwgY2F0ZWdvcnk9J3dhcm5pbmcnKSAtPlxyXG4gIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxyXG4gIHJldHVybiBpZiBub3QgbWVzc2FnZVxyXG5cclxuICAkKCcjbm90aWZpY2F0aW9ucycpLmFwcGVuZCBcIlwiXCJcclxuICAgICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LWRpc21pc3NhYmxlIGFsZXJ0LSN7Y2F0ZWdvcnl9XCI+XHJcbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjbG9zZVwiIGRhdGEtZGlzbWlzcz1cImFsZXJ0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+JnRpbWVzOzwvYnV0dG9uPlxyXG4gICAgICAgICN7bWVzc2FnZX1cclxuICAgICAgPC9kaXY+XHJcbiAgICBcIlwiXCJcclxuXHJcblxyXG53aW5kb3cuc2l6ZV9odW1hbiA9IChuYnl0ZXMpIC0+XHJcbiAgZm9yIHN1ZmZpeCBpbiBbJ0InLCAnS0InLCAnTUInLCAnR0InLCAnVEInXVxyXG4gICAgaWYgbmJ5dGVzIDwgMTAwMFxyXG4gICAgICBpZiBzdWZmaXggPT0gJ0InXHJcbiAgICAgICAgcmV0dXJuIFwiI3tuYnl0ZXN9ICN7c3VmZml4fVwiXHJcbiAgICAgIHJldHVybiBcIiN7cGFyc2VJbnQobmJ5dGVzICogMTApIC8gMTB9ICN7c3VmZml4fVwiXHJcbiAgICBuYnl0ZXMgLz0gMTAyNC4wXHJcbiIsIiQgLT5cclxuICBpbml0X2NvbW1vbigpXHJcblxyXG4kIC0+ICQoJ2h0bWwuYXV0aCcpLmVhY2ggLT5cclxuICBpbml0X2F1dGgoKVxyXG5cclxuJCAtPiAkKCdodG1sLnVzZXItbGlzdCcpLmVhY2ggLT5cclxuICBpbml0X3VzZXJfbGlzdCgpXHJcblxyXG4kIC0+ICQoJ2h0bWwudXNlci1tZXJnZScpLmVhY2ggLT5cclxuICBpbml0X3VzZXJfbWVyZ2UoKVxyXG5cclxuJCAtPiAkKCdodG1sLnJlc291cmNlLWxpc3QnKS5lYWNoIC0+XHJcbiAgaW5pdF9yZXNvdXJjZV9saXN0KClcclxuXHJcbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS12aWV3JykuZWFjaCAtPlxyXG4gIGluaXRfcmVzb3VyY2VfdmlldygpXHJcblxyXG4kIC0+ICQoJ2h0bWwucG9zdC1jcmVhdGUnKS5lYWNoIC0+XHJcbiAgaW5pdF9yZXNvdXJjZV91cGxvYWQoKVxyXG5cclxuJCAtPiAkKCdodG1sLnJlY29tbWVuZGVyLWNyZWF0ZScpLmVhY2ggLT5cclxuICBpbml0X3Jlc291cmNlX3VwbG9hZCgpXHJcblxyXG4iLCJ3aW5kb3cuaW5pdF9hdXRoID0gLT5cclxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UgLT5cclxuICAgIGJ1dHRvbnMgPSAkKCcuYnRuLXNvY2lhbCcpLnRvQXJyYXkoKS5jb25jYXQgJCgnLmJ0bi1zb2NpYWwtaWNvbicpLnRvQXJyYXkoKVxyXG4gICAgZm9yIGJ1dHRvbiBpbiBidXR0b25zXHJcbiAgICAgIGhyZWYgPSAkKGJ1dHRvbikucHJvcCAnaHJlZidcclxuICAgICAgaWYgJCgnLnJlbWVtYmVyIGlucHV0JykuaXMgJzpjaGVja2VkJ1xyXG4gICAgICAgICQoYnV0dG9uKS5wcm9wICdocmVmJywgXCIje2hyZWZ9JnJlbWVtYmVyPXRydWVcIlxyXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIGhyZWYucmVwbGFjZSAnJnJlbWVtYmVyPXRydWUnLCAnJ1xyXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCBmYWxzZVxyXG5cclxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UoKVxyXG4iLCIjIGh0dHA6Ly9ibG9nLmFub3JnYW4uY29tLzIwMTIvMDkvMzAvcHJldHR5LW11bHRpLWZpbGUtdXBsb2FkLWJvb3RzdHJhcC1qcXVlcnktdHdpZy1zaWxleC9cclxuaWYgJChcIi5wcmV0dHktZmlsZVwiKS5sZW5ndGhcclxuICAkKFwiLnByZXR0eS1maWxlXCIpLmVhY2ggKCkgLT5cclxuICAgIHByZXR0eV9maWxlID0gJCh0aGlzKVxyXG4gICAgZmlsZV9pbnB1dCA9IHByZXR0eV9maWxlLmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJylcclxuICAgIGZpbGVfaW5wdXQuaGlkZSgpXHJcbiAgICBmaWxlX2lucHV0LmNoYW5nZSAoKSAtPlxyXG4gICAgICBmaWxlcyA9IGZpbGVfaW5wdXRbMF0uZmlsZXNcclxuICAgICAgaW5mbyA9IFwiXCJcclxuICAgICAgaWYgZmlsZXMubGVuZ3RoID4gMVxyXG4gICAgICAgIGluZm8gPSBcIiN7ZmlsZXMubGVuZ3RofSBmaWxlcyBzZWxlY3RlZFwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBwYXRoID0gZmlsZV9pbnB1dC52YWwoKS5zcGxpdChcIlxcXFxcIilcclxuICAgICAgICBpbmZvID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdXHJcbiAgICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXAgaW5wdXRcIikudmFsKGluZm8pXHJcbiAgICBwcmV0dHlfZmlsZS5maW5kKFwiLmlucHV0LWdyb3VwXCIpLmNsaWNrIChlKSAtPlxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgZmlsZV9pbnB1dC5jbGljaygpXHJcbiAgICAgICQodGhpcykuYmx1cigpXHJcbiIsIndpbmRvdy5pbml0X3Jlc291cmNlX2xpc3QgPSAoKSAtPlxyXG4gIGluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbigpXHJcblxyXG53aW5kb3cuaW5pdF9yZXNvdXJjZV92aWV3ID0gKCkgLT5cclxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxyXG5cclxud2luZG93LmluaXRfcmVzb3VyY2VfdXBsb2FkID0gKCkgLT5cclxuXHJcbiAgaWYgd2luZG93LkZpbGUgYW5kIHdpbmRvdy5GaWxlTGlzdCBhbmQgd2luZG93LkZpbGVSZWFkZXJcclxuICAgIHdpbmRvdy5maWxlX3VwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlclxyXG4gICAgICB1cGxvYWRfaGFuZGxlcjogdXBsb2FkX2hhbmRsZXJcclxuICAgICAgc2VsZWN0b3I6ICQoJy5maWxlJylcclxuICAgICAgZHJvcF9hcmVhOiAkKCcuZHJvcC1hcmVhJylcclxuICAgICAgY29uZmlybV9tZXNzYWdlOiAnRmlsZXMgYXJlIHN0aWxsIGJlaW5nIHVwbG9hZGVkLidcclxuICAgICAgdXBsb2FkX3VybDogJCgnLmZpbGUnKS5kYXRhKCdnZXQtdXBsb2FkLXVybCcpXHJcbiAgICAgIGFsbG93ZWRfdHlwZXM6IFtdXHJcbiAgICAgIG1heF9zaXplOiAxMDI0ICogMTAyNCAqIDEwMjRcclxuXHJcbnVwbG9hZF9oYW5kbGVyID1cclxuICBwcmV2aWV3OiAoZmlsZSkgLT5cclxuICAgICRyZXNvdXJjZSA9ICQgXCJcIlwiXHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC1sZy0yIGNvbC1tZC0zIGNvbC1zbS00IGNvbC14cy02XCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidGh1bWJuYWlsXCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmV2aWV3XCI+PC9kaXY+XHJcbiAgICAgICAgICAgIDxoNT4je2ZpbGUubmFtZX08L2g1PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3NcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtYmFyXCIgc3R5bGU9XCJ3aWR0aDogMCU7XCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLXRleHRcIj48L2Rpdj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgXCJcIlwiXHJcbiAgICAkcHJldmlldyA9ICQoJy5wcmV2aWV3JywgJHJlc291cmNlKVxyXG5cclxuICAgIGlmIGZpbGVfdXBsb2FkZXIuYWN0aXZlX2ZpbGVzIDwgMTYgYW5kIGZpbGUudHlwZS5pbmRleE9mKFwiaW1hZ2VcIikgaXMgMFxyXG4gICAgICByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXHJcbiAgICAgIHJlYWRlci5vbmxvYWQgPSAoZSkgPT5cclxuICAgICAgICAkcHJldmlldy5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCBcInVybCgje2UudGFyZ2V0LnJlc3VsdH0pXCIpXHJcbiAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpXHJcbiAgICBlbHNlXHJcbiAgICAgICRwcmV2aWV3LnRleHQoZmlsZS50eXBlIG9yICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKVxyXG5cclxuICAgICQoJy5yZXNvdXJjZS11cGxvYWRzJykucHJlcGVuZCgkcmVzb3VyY2UpXHJcblxyXG4gICAgKHByb2dyZXNzLCByZXNvdXJjZSwgZXJyb3IpID0+XHJcbiAgICAgIGlmIGVycm9yXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5hZGRDbGFzcygncHJvZ3Jlc3MtYmFyLWRhbmdlcicpXHJcbiAgICAgICAgaWYgZXJyb3IgPT0gJ3Rvb19iaWcnXHJcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgVG9vIGJpZywgbWF4OiAje3NpemVfaHVtYW4oZmlsZV91cGxvYWRlci5tYXhfc2l6ZSl9LlwiKVxyXG4gICAgICAgIGVsc2UgaWYgZXJyb3IgPT0gJ3dyb25nX3R5cGUnXHJcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgV3JvbmcgZmlsZSB0eXBlLlwiKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KCdGYWlsZWQhJylcclxuICAgICAgICByZXR1cm5cclxuXHJcbiAgICAgIGlmIHByb2dyZXNzID09IDEwMC4wIGFuZCByZXNvdXJjZVxyXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItc3VjY2VzcycpXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJTdWNjZXNzICN7c2l6ZV9odW1hbihmaWxlLnNpemUpfVwiKVxyXG4gICAgICAgIGlmIHJlc291cmNlLmltYWdlX3VybCBhbmQgJHByZXZpZXcudGV4dCgpLmxlbmd0aCA+IDBcclxuICAgICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7cmVzb3VyY2UuaW1hZ2VfdXJsfSlcIilcclxuICAgICAgICAgICRwcmV2aWV3LnRleHQoJycpXHJcbiAgICAgIGVsc2UgaWYgcHJvZ3Jlc3MgPT0gMTAwLjBcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiMTAwJSAtIFByb2Nlc3NpbmcuLlwiKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsIFwiI3twcm9ncmVzc30lXCIpXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCIje3Byb2dyZXNzfSUgb2YgI3tzaXplX2h1bWFuKGZpbGUuc2l6ZSl9XCIpXHJcblxyXG5cclxud2luZG93LmluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbiA9ICgpIC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWRlbGV0ZScsIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBpZiBjb25maXJtKCdQcmVzcyBPSyB0byBkZWxldGUgdGhlIHJlc291cmNlJylcclxuICAgICAgJCh0aGlzKS5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpXHJcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCAkKHRoaXMpLmRhdGEoJ2FwaS11cmwnKSwgKGVyciwgcmVzdWx0KSA9PlxyXG4gICAgICAgIGlmIGVyclxyXG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXHJcbiAgICAgICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nIGR1cmluZyBkZWxldGUhJywgZXJyXHJcbiAgICAgICAgICByZXR1cm5cclxuICAgICAgICB0YXJnZXQgPSAkKHRoaXMpLmRhdGEoJ3RhcmdldCcpXHJcbiAgICAgICAgcmVkaXJlY3RfdXJsID0gJCh0aGlzKS5kYXRhKCdyZWRpcmVjdC11cmwnKVxyXG4gICAgICAgIGlmIHRhcmdldFxyXG4gICAgICAgICAgJChcIiN7dGFyZ2V0fVwiKS5yZW1vdmUoKVxyXG4gICAgICAgIGlmIHJlZGlyZWN0X3VybFxyXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZWRpcmVjdF91cmwiLCJ3aW5kb3cuaW5pdF91c2VyX2xpc3QgPSAtPlxyXG4gIGluaXRfdXNlcl9zZWxlY3Rpb25zKClcclxuICBpbml0X3VzZXJfZGVsZXRlX2J0bigpXHJcbiAgaW5pdF91c2VyX21lcmdlX2J0bigpXHJcblxyXG5cclxuaW5pdF91c2VyX3NlbGVjdGlvbnMgPSAtPlxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XHJcbiAgICB1c2VyX3NlbGVjdF9yb3cgJCh0aGlzKVxyXG5cclxuICAkKCcjc2VsZWN0LWFsbCcpLmNoYW5nZSAtPlxyXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnByb3AgJ2NoZWNrZWQnLCAkKHRoaXMpLmlzICc6Y2hlY2tlZCdcclxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XHJcbiAgICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXHJcblxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgLT5cclxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXHJcblxyXG5cclxudXNlcl9zZWxlY3Rfcm93ID0gKCRlbGVtZW50KSAtPlxyXG4gIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XHJcbiAgICBpZCA9ICRlbGVtZW50LnZhbCgpXHJcbiAgICAkKFwiIyN7aWR9XCIpLnRvZ2dsZUNsYXNzICd3YXJuaW5nJywgJGVsZW1lbnQuaXMgJzpjaGVja2VkJ1xyXG5cclxuXHJcbnVwZGF0ZV91c2VyX3NlbGVjdGlvbnMgPSAtPlxyXG4gIHNlbGVjdGVkID0gJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykubGVuZ3RoXHJcbiAgJCgnI3VzZXItYWN0aW9ucycpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA9PSAwXHJcbiAgJCgnI3VzZXItbWVyZ2UnKS50b2dnbGVDbGFzcyAnaGlkZGVuJywgc2VsZWN0ZWQgPCAyXHJcbiAgaWYgc2VsZWN0ZWQgaXMgMFxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcclxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXHJcbiAgZWxzZSBpZiAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOm5vdCg6Y2hlY2tlZCknKS5sZW5ndGggaXMgMFxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcclxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIHRydWVcclxuICBlbHNlXHJcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCB0cnVlXHJcblxyXG5cclxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4jIERlbGV0ZSBVc2VycyBTdHVmZlxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbmluaXRfdXNlcl9kZWxldGVfYnRuID0gLT5cclxuICAkKCcjdXNlci1kZWxldGUnKS5jbGljayAoZSkgLT5cclxuICAgIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBjb25maXJtX21lc3NhZ2UgPSAoJCh0aGlzKS5kYXRhICdjb25maXJtJykucmVwbGFjZSAne3VzZXJzfScsICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxyXG4gICAgaWYgY29uZmlybSBjb25maXJtX21lc3NhZ2VcclxuICAgICAgdXNlcl9rZXlzID0gW11cclxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxyXG4gICAgICAgICQodGhpcykuYXR0ciAnZGlzYWJsZWQnLCB0cnVlXHJcbiAgICAgICAgdXNlcl9rZXlzLnB1c2ggJCh0aGlzKS52YWwoKVxyXG4gICAgICBkZWxldGVfdXJsID0gJCh0aGlzKS5kYXRhICdhcGktdXJsJ1xyXG4gICAgICBzdWNjZXNzX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ3N1Y2Nlc3MnXHJcbiAgICAgIGVycm9yX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ2Vycm9yJ1xyXG4gICAgICBhcGlfY2FsbCAnREVMRVRFJywgZGVsZXRlX3VybCwge3VzZXJfa2V5czogdXNlcl9rZXlzLmpvaW4oJywnKX0sIChlcnIsIHJlc3VsdCkgLT5cclxuICAgICAgICBpZiBlcnJcclxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06ZGlzYWJsZWQnKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcclxuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIGVycm9yX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnZGFuZ2VyJ1xyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgJChcIiMje3Jlc3VsdC5qb2luKCcsICMnKX1cIikuZmFkZU91dCAtPlxyXG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKVxyXG4gICAgICAgICAgdXBkYXRlX3VzZXJfc2VsZWN0aW9ucygpXHJcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBzdWNjZXNzX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnc3VjY2VzcydcclxuXHJcblxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiMgTWVyZ2UgVXNlcnMgU3R1ZmZcclxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG53aW5kb3cuaW5pdF91c2VyX21lcmdlID0gLT5cclxuICB1c2VyX2tleXMgPSAkKCcjdXNlcl9rZXlzJykudmFsKClcclxuICBhcGlfdXJsID0gJCgnLmFwaS11cmwnKS5kYXRhICdhcGktdXJsJ1xyXG4gIGFwaV9jYWxsICdHRVQnLCBhcGlfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXN9LCAoZXJyb3IsIHJlc3VsdCkgLT5cclxuICAgIGlmIGVycm9yXHJcbiAgICAgIExPRyAnU29tZXRoaW5nIHdlbnQgdGVycmlibHkgd3JvbmcnXHJcbiAgICAgIHJldHVyblxyXG4gICAgd2luZG93LnVzZXJfZGJzID0gcmVzdWx0XHJcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykucmVtb3ZlQXR0ciAnZGlzYWJsZWQnXHJcblxyXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgKGV2ZW50KSAtPlxyXG4gICAgdXNlcl9rZXkgPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpXHJcbiAgICBzZWxlY3RfZGVmYXVsdF91c2VyIHVzZXJfa2V5XHJcblxyXG5cclxuc2VsZWN0X2RlZmF1bHRfdXNlciA9ICh1c2VyX2tleSkgLT5cclxuICAkKCcudXNlci1yb3cnKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpLmFkZENsYXNzICdkYW5nZXInXHJcbiAgJChcIiMje3VzZXJfa2V5fVwiKS5yZW1vdmVDbGFzcygnZGFuZ2VyJykuYWRkQ2xhc3MgJ3N1Y2Nlc3MnXHJcblxyXG4gIGZvciB1c2VyX2RiIGluIHVzZXJfZGJzXHJcbiAgICBpZiB1c2VyX2tleSA9PSB1c2VyX2RiLmtleVxyXG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfa2V5XScpLnZhbCB1c2VyX2RiLmtleVxyXG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJuYW1lXScpLnZhbCB1c2VyX2RiLnVzZXJuYW1lXHJcbiAgICAgICQoJ2lucHV0W25hbWU9bmFtZV0nKS52YWwgdXNlcl9kYi5uYW1lXHJcbiAgICAgICQoJ2lucHV0W25hbWU9ZW1haWxdJykudmFsIHVzZXJfZGIuZW1haWxcclxuICAgICAgYnJlYWtcclxuXHJcblxyXG5pbml0X3VzZXJfbWVyZ2VfYnRuID0gLT5cclxuICAkKCcjdXNlci1tZXJnZScpLmNsaWNrIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICB1c2VyX2tleXMgPSBbXVxyXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxyXG4gICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXHJcbiAgICB1c2VyX21lcmdlX3VybCA9ICQodGhpcykuZGF0YSAndXNlci1tZXJnZS11cmwnXHJcbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFwiI3t1c2VyX21lcmdlX3VybH0/dXNlcl9rZXlzPSN7dXNlcl9rZXlzLmpvaW4oJywnKX1cIlxyXG4iLCJcclxuZnVuY3Rpb24gZm9sbG93RnVuY3Rpb24oeCwgeSkge1xyXG5cclxuICAgIGFwaV91cmwgPSAnL2FwaS92MS9mb2xsb3cvJyArIHkgKyAnLyc7XHJcblxyXG4gICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJsYWJlbC1kZWZhdWx0XCIpKXtcclxuICAgICAgICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJub3QtbG9nZ2VkLWluXCIpKXtcclxuLy8gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5jc3Moe1widmlzaWJpbGl0eVwiOlwidmlzaWJsZVwiLFwiZGlzcGxheVwiOlwiYmxvY2tcIn0pO1xyXG4gICAgICAgICAgICAkKFwiLnJlY29tbWVuZGVyXCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcclxuICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuZmFkZUluKCk7XHJcbi8vICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVPdXQoKTtcclxuICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImxhYmVsLWRlZmF1bHRcIilcclxuICAgICAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtc3VjY2Vzc1wiKVxyXG4gICAgICAgICAgICB4LmlubmVySFRNTD0nRk9MTE9XSU5HJztcclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLCAgICAvL1lvdXIgYXBpIHVybFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnUFVUJywgICAvL3R5cGUgaXMgYW55IEhUVFAgbWV0aG9kXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sICAgICAgLy9EYXRhIGFzIGpzIG9iamVjdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIDtcclxuICAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImxhYmVsLXN1Y2Nlc3NcIikpe1xyXG5cclxuICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJsYWJlbC1zdWNjZXNzXCIpXHJcbiAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtZGVmYXVsdFwiKVxyXG4gICAgICAgIHguaW5uZXJIVE1MID0gJ0ZPTExPVyc7XHJcbiAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0RFTEVURScsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgO1xyXG4gICAgfVxyXG5cclxufVxyXG5cclxuJCgnLmNsb3NlLWljb24nKS5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xyXG4gICQodGhpcykuY2xvc2VzdCgnLmNhcmQnKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XHJcbiAgJChcIi5yZWNvbW1lbmRlclwiKS5mYWRlSW4oKTtcclxufSkiLCIvLyhmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LGZhY3Rvcnkpe2lmKHR5cGVvZiBleHBvcnRzPT09XCJvYmplY3RcIiYmdHlwZW9mIG1vZHVsZT09PVwib2JqZWN0XCIpbW9kdWxlLmV4cG9ydHM9ZmFjdG9yeSgpO2Vsc2UgaWYodHlwZW9mIGRlZmluZT09PVwiZnVuY3Rpb25cIiYmZGVmaW5lLmFtZClkZWZpbmUoXCJHaWZmZmVyXCIsW10sZmFjdG9yeSk7ZWxzZSBpZih0eXBlb2YgZXhwb3J0cz09PVwib2JqZWN0XCIpZXhwb3J0c1tcIkdpZmZmZXJcIl09ZmFjdG9yeSgpO2Vsc2Ugcm9vdFtcIkdpZmZmZXJcIl09ZmFjdG9yeSgpfSkodGhpcyxmdW5jdGlvbigpe3ZhciBkPWRvY3VtZW50O3ZhciBwbGF5U2l6ZT02MDt2YXIgR2lmZmZlcj1mdW5jdGlvbihvcHRpb25zKXt2YXIgaW1hZ2VzLGk9MCxnaWZzPVtdO2ltYWdlcz1kLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1naWZmZmVyXVwiKTtmb3IoO2k8aW1hZ2VzLmxlbmd0aDsrK2kpcHJvY2VzcyhpbWFnZXNbaV0sZ2lmcyxvcHRpb25zKTtyZXR1cm4gZ2lmc307ZnVuY3Rpb24gZm9ybWF0VW5pdCh2KXtyZXR1cm4gdisodi50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjA/XCJcIjpcInB4XCIpfWZ1bmN0aW9uIHBhcnNlU3R5bGVzKHN0eWxlcyl7dmFyIHN0eWxlc1N0cj1cIlwiO2Zvcihwcm9wIGluIHN0eWxlcylzdHlsZXNTdHIrPXByb3ArXCI6XCIrc3R5bGVzW3Byb3BdK1wiO1wiO3JldHVybiBzdHlsZXNTdHJ9ZnVuY3Rpb24gY3JlYXRlQ29udGFpbmVyKHcsaCxlbCxhbHRUZXh0LG9wdHMpe3ZhciBhbHQ7dmFyIGNvbj1kLmNyZWF0ZUVsZW1lbnQoXCJCVVRUT05cIik7dmFyIGNscz1lbC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKTt2YXIgaWQ9ZWwuZ2V0QXR0cmlidXRlKFwiaWRcIik7dmFyIHBsYXlCdXR0b25TdHlsZXM9b3B0cyYmb3B0cy5wbGF5QnV0dG9uU3R5bGVzP3BhcnNlU3R5bGVzKG9wdHMucGxheUJ1dHRvblN0eWxlcyk6W1wid2lkdGg6XCIrcGxheVNpemUrXCJweFwiLFwiaGVpZ2h0OlwiK3BsYXlTaXplK1wicHhcIixcImJvcmRlci1yYWRpdXM6XCIrcGxheVNpemUvMitcInB4XCIsXCJiYWNrZ3JvdW5kOnJnYmEoMCwgMCwgMCwgMC4zKVwiLFwicG9zaXRpb246YWJzb2x1dGVcIixcInRvcDo1MCVcIixcImxlZnQ6NTAlXCIsXCJtYXJnaW46LVwiK3BsYXlTaXplLzIrXCJweFwiXS5qb2luKFwiO1wiKTt2YXIgcGxheUJ1dHRvbkljb25TdHlsZXM9b3B0cyYmb3B0cy5wbGF5QnV0dG9uSWNvblN0eWxlcz9wYXJzZVN0eWxlcyhvcHRzLnBsYXlCdXR0b25JY29uU3R5bGVzKTpbXCJ3aWR0aDogMFwiLFwiaGVpZ2h0OiAwXCIsXCJib3JkZXItdG9wOiAxNHB4IHNvbGlkIHRyYW5zcGFyZW50XCIsXCJib3JkZXItYm90dG9tOiAxNHB4IHNvbGlkIHRyYW5zcGFyZW50XCIsXCJib3JkZXItbGVmdDogMTRweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSlcIixcInBvc2l0aW9uOiBhYnNvbHV0ZVwiLFwibGVmdDogMjZweFwiLFwidG9wOiAxNnB4XCJdLmpvaW4oXCI7XCIpO2Nscz9jb24uc2V0QXR0cmlidXRlKFwiY2xhc3NcIixlbC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSk6bnVsbDtpZD9jb24uc2V0QXR0cmlidXRlKFwiaWRcIixlbC5nZXRBdHRyaWJ1dGUoXCJpZFwiKSk6bnVsbDtjb24uc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInBvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtwYWRkaW5nOjA7XCIpO2Nvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiLFwidHJ1ZVwiKTt2YXIgcGxheT1kLmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7cGxheS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLFwiZ2lmZmZlci1wbGF5LWJ1dHRvblwiKTtwbGF5LnNldEF0dHJpYnV0ZShcInN0eWxlXCIscGxheUJ1dHRvblN0eWxlcyk7dmFyIHRybmdsPWQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTt0cm5nbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLHBsYXlCdXR0b25JY29uU3R5bGVzKTtwbGF5LmFwcGVuZENoaWxkKHRybmdsKTtpZihhbHRUZXh0KXthbHQ9ZC5jcmVhdGVFbGVtZW50KFwicFwiKTthbHQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIixcImdpZmZmZXItYWx0XCIpO2FsdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiYm9yZGVyOjA7Y2xpcDpyZWN0KDAgMCAwIDApO2hlaWdodDoxcHg7b3ZlcmZsb3c6aGlkZGVuO3BhZGRpbmc6MDtwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxcHg7XCIpO2FsdC5pbm5lclRleHQ9YWx0VGV4dCtcIiwgaW1hZ2VcIn1jb24uYXBwZW5kQ2hpbGQocGxheSk7ZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY29uLGVsKTthbHRUZXh0P2Nvbi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhbHQsY29uLm5leHRTaWJsaW5nKTpudWxsO3JldHVybntjOmNvbixwOnBsYXl9fWZ1bmN0aW9uIGNhbGN1bGF0ZVBlcmNlbnRhZ2VEaW0oZWwsdyxoLHdPcmlnLGhPcmlnKXt2YXIgcGFyZW50RGltVz1lbC5wYXJlbnROb2RlLm9mZnNldFdpZHRoO3ZhciBwYXJlbnREaW1IPWVsLnBhcmVudE5vZGUub2Zmc2V0SGVpZ2h0O3ZhciByYXRpbz13T3JpZy9oT3JpZztpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7dz1wYXJzZUludCh3LnRvU3RyaW5nKCkucmVwbGFjZShcIiVcIixcIlwiKSk7dz13LzEwMCpwYXJlbnREaW1XO2g9dy9yYXRpb31lbHNlIGlmKGgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtoPXBhcnNlSW50KGgudG9TdHJpbmcoKS5yZXBsYWNlKFwiJVwiLFwiXCIpKTtoPWgvMTAwKnBhcmVudERpbVc7dz1oL3JhdGlvfXJldHVybnt3OncsaDpofX1mdW5jdGlvbiBwcm9jZXNzKGVsLGdpZnMsb3B0aW9ucyl7dmFyIHVybCxjb24sYyx3LGgsZHVyYXRpb24scGxheSxnaWYscGxheWluZz1mYWxzZSxjYyxpc0MsZHVyYXRpb25UaW1lb3V0LGRpbXMsYWx0VGV4dDt1cmw9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyXCIpO3c9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLXdpZHRoXCIpO2g9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLWhlaWdodFwiKTtkdXJhdGlvbj1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItZHVyYXRpb25cIik7YWx0VGV4dD1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItYWx0XCIpO2VsLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiO2M9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtpc0M9ISEoYy5nZXRDb250ZXh0JiZjLmdldENvbnRleHQoXCIyZFwiKSk7aWYodyYmaCYmaXNDKWNjPWNyZWF0ZUNvbnRhaW5lcih3LGgsZWwsYWx0VGV4dCxvcHRpb25zKTtlbC5vbmxvYWQ9ZnVuY3Rpb24oKXtpZighaXNDKXJldHVybjt3PXd8fGVsLndpZHRoO2g9aHx8ZWwuaGVpZ2h0O2lmKCFjYyljYz1jcmVhdGVDb250YWluZXIodyxoLGVsLGFsdFRleHQsb3B0aW9ucyk7Y29uPWNjLmM7cGxheT1jYy5wO2RpbXM9Y2FsY3VsYXRlUGVyY2VudGFnZURpbShjb24sdyxoLGVsLndpZHRoLGVsLmhlaWdodCk7Z2lmcy5wdXNoKGNvbik7Y29uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGZ1bmN0aW9uKCl7Y2xlYXJUaW1lb3V0KGR1cmF0aW9uVGltZW91dCk7aWYoIXBsYXlpbmcpe3BsYXlpbmc9dHJ1ZTtnaWY9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIklNR1wiKTtnaWYuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcIndpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7XCIpO2dpZi5zZXRBdHRyaWJ1dGUoXCJkYXRhLXVyaVwiLE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoxZTUpKzEpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtnaWYuc3JjPXVybH0sMCk7Y29uLnJlbW92ZUNoaWxkKHBsYXkpO2Nvbi5yZW1vdmVDaGlsZChjKTtjb24uYXBwZW5kQ2hpbGQoZ2lmKTtpZihwYXJzZUludChkdXJhdGlvbik+MCl7ZHVyYXRpb25UaW1lb3V0PXNldFRpbWVvdXQoZnVuY3Rpb24oKXtwbGF5aW5nPWZhbHNlO2Nvbi5hcHBlbmRDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoZ2lmKTtjb24uYXBwZW5kQ2hpbGQoYyk7Z2lmPW51bGx9LGR1cmF0aW9uKX19ZWxzZXtwbGF5aW5nPWZhbHNlO2Nvbi5hcHBlbmRDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoZ2lmKTtjb24uYXBwZW5kQ2hpbGQoYyk7Z2lmPW51bGx9fSk7Yy53aWR0aD1kaW1zLnc7Yy5oZWlnaHQ9ZGltcy5oO2MuZ2V0Q29udGV4dChcIjJkXCIpLmRyYXdJbWFnZShlbCwwLDAsZGltcy53LGRpbXMuaCk7Y29uLmFwcGVuZENoaWxkKGMpO2Nvbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwicG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7d2lkdGg6XCIrZGltcy53K1wicHg7aGVpZ2h0OlwiK2RpbXMuaCtcInB4O2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtwYWRkaW5nOjA7XCIpO2Muc3R5bGUud2lkdGg9XCIxMDAlXCI7Yy5zdHlsZS5oZWlnaHQ9XCIxMDAlXCI7aWYody50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjAmJmgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9dztjb24uc3R5bGUuaGVpZ2h0PWh9ZWxzZSBpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7Y29uLnN0eWxlLndpZHRoPXc7Y29uLnN0eWxlLmhlaWdodD1cImluaGVyaXRcIn1lbHNlIGlmKGgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9XCJpbmhlcml0XCI7Y29uLnN0eWxlLmhlaWdodD1ofWVsc2V7Y29uLnN0eWxlLndpZHRoPWRpbXMudytcInB4XCI7Y29uLnN0eWxlLmhlaWdodD1kaW1zLmgrXCJweFwifX07ZWwuc3JjPXVybH1yZXR1cm4gR2lmZmZlcn0pOyIsIlxyXG4vLyBGb2xsb3dpbmcgY29kZSBhZGRzIHR5cGVhaGVhZCBrZXl3b3JkcyB0byBzZWFyY2ggYmFyc1xyXG5cclxudmFyIGtleXdvcmRzID0gbmV3IEJsb29kaG91bmQoe1xyXG4gICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxyXG4gICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxyXG4gICAgcHJlZmV0Y2g6IHtcclxuICAgIHVybDogJy9rZXl3b3JkcycsXHJcbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGxpc3QpIHtcclxuICAgICAgcmV0dXJuICQubWFwKGxpc3QsIGZ1bmN0aW9uKGNpdHluYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgbmFtZTogY2l0eW5hbWUgfTsgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxufSk7XHJcblxyXG5rZXl3b3Jkcy5pbml0aWFsaXplKCk7XHJcblxyXG4kKCcjc2VhcmNoJykudHlwZWFoZWFkKG51bGwsIHtcclxuICAgICBtaW5sZW5ndGg6IDEsXHJcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcclxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXHJcbiAgICAgdmFsdWVLZXk6ICduYW1lJyxcclxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXHJcbn0pO1xyXG5cclxuJCgnI3NlYXJjaF9wYWdlJykudHlwZWFoZWFkKG51bGwsIHtcclxuICAgICBtaW5sZW5ndGg6IDEsXHJcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcclxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXHJcbiAgICAgdmFsdWVLZXk6ICduYW1lJyxcclxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXHJcbn0pO1xyXG5cclxuXHJcblxyXG4kKCcja2V5d29yZHMnKS50YWdzaW5wdXQoe1xyXG4gICAgY29uZmlybUtleXM6IFsxMywgNDRdLFxyXG4gICAgdHlwZWFoZWFkanM6IFt7XHJcbiAgICAgICAgICBtaW5MZW5ndGg6IDEsXHJcbiAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXHJcblxyXG4gICAgfSx7XHJcbiAgICAgICAgbWlubGVuZ3RoOiAxLFxyXG4gICAgICAgIG5hbWU6ICdrZXl3b3JkcycsXHJcbiAgICAgICAgZGlzcGxheUtleTogJ25hbWUnLFxyXG4gICAgICAgIHZhbHVlS2V5OiAnbmFtZScsXHJcbiAgICAgICAgc291cmNlOiBrZXl3b3Jkcy50dEFkYXB0ZXIoKVxyXG4gICAgfV0sXHJcbiAgICBmcmVlSW5wdXQ6IHRydWUsXHJcblxyXG59KTtcclxuXHJcbiQoJyNsb2NhdGlvbl9rZXl3b3JkcycpLnRhZ3NpbnB1dCh7XHJcbiAgICBjb25maXJtS2V5czogWzEzLCA0NF0sXHJcbiAgICB0eXBlYWhlYWRqczogW3tcclxuICAgICAgICAgIG1pbkxlbmd0aDogMSxcclxuICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcclxuXHJcbiAgICB9LHtcclxuICAgICAgICBtaW5sZW5ndGg6IDEsXHJcbiAgICAgICAgbmFtZTogJ2tleXdvcmRzJyxcclxuICAgICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXHJcbiAgICAgICAgdmFsdWVLZXk6ICduYW1lJyxcclxuICAgICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXHJcbiAgICB9XSxcclxuICAgIGZyZWVJbnB1dDogdHJ1ZSxcclxuXHJcbn0pO1xyXG5cclxuJCgnLmRyYWFpa25vcGplJykuY2xpY2soZnVuY3Rpb24gKCkge1xyXG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcblx0XHQkKCcuZ3JpZCcpLm1hc29ucnkoJ2xheW91dCcpO1xyXG5cdH0sIDEwMCk7XHJcbn0pO1xyXG5cclxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gIEdpZmZmZXIoe1xyXG4gICAgICBwbGF5QnV0dG9uU3R5bGVzOiB7XHJcbiAgICAgICAgJ3dpZHRoJzogJzYwcHgnLFxyXG4gICAgICAgICdoZWlnaHQnOiAnNjBweCcsXHJcbiAgICAgICAgJ2JvcmRlci1yYWRpdXMnOiAnMzBweCcsXHJcbiAgICAgICAgJ2JhY2tncm91bmQnOiAncmdiYSgwLCAwLCAwLCAwLjMpJyxcclxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICd0b3AnOiAnNTAlJyxcclxuICAgICAgICAnbGVmdCc6ICc1MCUnLFxyXG4gICAgICAgICdtYXJnaW4nOiAnLTMwcHggMCAwIC0zMHB4J1xyXG4gICAgICB9LFxyXG4gICAgICBwbGF5QnV0dG9uSWNvblN0eWxlczoge1xyXG4gICAgICAgICd3aWR0aCc6ICcwJyxcclxuICAgICAgICAnaGVpZ2h0JzogJzAnLFxyXG4gICAgICAgICdib3JkZXItdG9wJzogJzE0cHggc29saWQgdHJhbnNwYXJlbnQnLFxyXG4gICAgICAgICdib3JkZXItYm90dG9tJzogJzE0cHggc29saWQgdHJhbnNwYXJlbnQnLFxyXG4gICAgICAgICdib3JkZXItbGVmdCc6ICcxNHB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsIDAuNSknLFxyXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgJ2xlZnQnOiAnMjZweCcsXHJcbiAgICAgICAgJ3RvcCc6ICcxNnB4J1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbiIsIi8qIVxyXG4gKiBNYXNvbnJ5IFBBQ0tBR0VEIHY0LjIuMFxyXG4gKiBDYXNjYWRpbmcgZ3JpZCBsYXlvdXQgbGlicmFyeVxyXG4gKiBodHRwOi8vbWFzb25yeS5kZXNhbmRyby5jb21cclxuICogTUlUIExpY2Vuc2VcclxuICogYnkgRGF2aWQgRGVTYW5kcm9cclxuICovXHJcblxyXG4hZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwianF1ZXJ5LWJyaWRnZXQvanF1ZXJ5LWJyaWRnZXRcIixbXCJqcXVlcnlcIl0sZnVuY3Rpb24oaSl7cmV0dXJuIGUodCxpKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUodCxyZXF1aXJlKFwianF1ZXJ5XCIpKTp0LmpRdWVyeUJyaWRnZXQ9ZSh0LHQualF1ZXJ5KX0od2luZG93LGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gaShpLHIsYSl7ZnVuY3Rpb24gaCh0LGUsbil7dmFyIG8scj1cIiQoKS5cIitpKycoXCInK2UrJ1wiKSc7cmV0dXJuIHQuZWFjaChmdW5jdGlvbih0LGgpe3ZhciB1PWEuZGF0YShoLGkpO2lmKCF1KXJldHVybiB2b2lkIHMoaStcIiBub3QgaW5pdGlhbGl6ZWQuIENhbm5vdCBjYWxsIG1ldGhvZHMsIGkuZS4gXCIrcik7dmFyIGQ9dVtlXTtpZighZHx8XCJfXCI9PWUuY2hhckF0KDApKXJldHVybiB2b2lkIHMocitcIiBpcyBub3QgYSB2YWxpZCBtZXRob2RcIik7dmFyIGw9ZC5hcHBseSh1LG4pO289dm9pZCAwPT09bz9sOm99KSx2b2lkIDAhPT1vP286dH1mdW5jdGlvbiB1KHQsZSl7dC5lYWNoKGZ1bmN0aW9uKHQsbil7dmFyIG89YS5kYXRhKG4saSk7bz8oby5vcHRpb24oZSksby5faW5pdCgpKToobz1uZXcgcihuLGUpLGEuZGF0YShuLGksbykpfSl9YT1hfHxlfHx0LmpRdWVyeSxhJiYoci5wcm90b3R5cGUub3B0aW9ufHwoci5wcm90b3R5cGUub3B0aW9uPWZ1bmN0aW9uKHQpe2EuaXNQbGFpbk9iamVjdCh0KSYmKHRoaXMub3B0aW9ucz1hLmV4dGVuZCghMCx0aGlzLm9wdGlvbnMsdCkpfSksYS5mbltpXT1mdW5jdGlvbih0KXtpZihcInN0cmluZ1wiPT10eXBlb2YgdCl7dmFyIGU9by5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gaCh0aGlzLHQsZSl9cmV0dXJuIHUodGhpcyx0KSx0aGlzfSxuKGEpKX1mdW5jdGlvbiBuKHQpeyF0fHx0JiZ0LmJyaWRnZXR8fCh0LmJyaWRnZXQ9aSl9dmFyIG89QXJyYXkucHJvdG90eXBlLnNsaWNlLHI9dC5jb25zb2xlLHM9XCJ1bmRlZmluZWRcIj09dHlwZW9mIHI/ZnVuY3Rpb24oKXt9OmZ1bmN0aW9uKHQpe3IuZXJyb3IodCl9O3JldHVybiBuKGV8fHQualF1ZXJ5KSxpfSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwiZXYtZW1pdHRlci9ldi1lbWl0dGVyXCIsZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSgpOnQuRXZFbWl0dGVyPWUoKX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz93aW5kb3c6dGhpcyxmdW5jdGlvbigpe2Z1bmN0aW9uIHQoKXt9dmFyIGU9dC5wcm90b3R5cGU7cmV0dXJuIGUub249ZnVuY3Rpb24odCxlKXtpZih0JiZlKXt2YXIgaT10aGlzLl9ldmVudHM9dGhpcy5fZXZlbnRzfHx7fSxuPWlbdF09aVt0XXx8W107cmV0dXJuLTE9PW4uaW5kZXhPZihlKSYmbi5wdXNoKGUpLHRoaXN9fSxlLm9uY2U9ZnVuY3Rpb24odCxlKXtpZih0JiZlKXt0aGlzLm9uKHQsZSk7dmFyIGk9dGhpcy5fb25jZUV2ZW50cz10aGlzLl9vbmNlRXZlbnRzfHx7fSxuPWlbdF09aVt0XXx8e307cmV0dXJuIG5bZV09ITAsdGhpc319LGUub2ZmPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fZXZlbnRzJiZ0aGlzLl9ldmVudHNbdF07aWYoaSYmaS5sZW5ndGgpe3ZhciBuPWkuaW5kZXhPZihlKTtyZXR1cm4tMSE9biYmaS5zcGxpY2UobiwxKSx0aGlzfX0sZS5lbWl0RXZlbnQ9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50c1t0XTtpZihpJiZpLmxlbmd0aCl7dmFyIG49MCxvPWlbbl07ZT1lfHxbXTtmb3IodmFyIHI9dGhpcy5fb25jZUV2ZW50cyYmdGhpcy5fb25jZUV2ZW50c1t0XTtvOyl7dmFyIHM9ciYmcltvXTtzJiYodGhpcy5vZmYodCxvKSxkZWxldGUgcltvXSksby5hcHBseSh0aGlzLGUpLG4rPXM/MDoxLG89aVtuXX1yZXR1cm4gdGhpc319LHR9KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJnZXQtc2l6ZS9nZXQtc2l6ZVwiLFtdLGZ1bmN0aW9uKCl7cmV0dXJuIGUoKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUoKTp0LmdldFNpemU9ZSgpfSh3aW5kb3csZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KHQpe3ZhciBlPXBhcnNlRmxvYXQodCksaT0tMT09dC5pbmRleE9mKFwiJVwiKSYmIWlzTmFOKGUpO3JldHVybiBpJiZlfWZ1bmN0aW9uIGUoKXt9ZnVuY3Rpb24gaSgpe2Zvcih2YXIgdD17d2lkdGg6MCxoZWlnaHQ6MCxpbm5lcldpZHRoOjAsaW5uZXJIZWlnaHQ6MCxvdXRlcldpZHRoOjAsb3V0ZXJIZWlnaHQ6MH0sZT0wO3U+ZTtlKyspe3ZhciBpPWhbZV07dFtpXT0wfXJldHVybiB0fWZ1bmN0aW9uIG4odCl7dmFyIGU9Z2V0Q29tcHV0ZWRTdHlsZSh0KTtyZXR1cm4gZXx8YShcIlN0eWxlIHJldHVybmVkIFwiK2UrXCIuIEFyZSB5b3UgcnVubmluZyB0aGlzIGNvZGUgaW4gYSBoaWRkZW4gaWZyYW1lIG9uIEZpcmVmb3g/IFNlZSBodHRwOi8vYml0Lmx5L2dldHNpemVidWcxXCIpLGV9ZnVuY3Rpb24gbygpe2lmKCFkKXtkPSEwO3ZhciBlPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7ZS5zdHlsZS53aWR0aD1cIjIwMHB4XCIsZS5zdHlsZS5wYWRkaW5nPVwiMXB4IDJweCAzcHggNHB4XCIsZS5zdHlsZS5ib3JkZXJTdHlsZT1cInNvbGlkXCIsZS5zdHlsZS5ib3JkZXJXaWR0aD1cIjFweCAycHggM3B4IDRweFwiLGUuc3R5bGUuYm94U2l6aW5nPVwiYm9yZGVyLWJveFwiO3ZhciBpPWRvY3VtZW50LmJvZHl8fGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtpLmFwcGVuZENoaWxkKGUpO3ZhciBvPW4oZSk7ci5pc0JveFNpemVPdXRlcj1zPTIwMD09dChvLndpZHRoKSxpLnJlbW92ZUNoaWxkKGUpfX1mdW5jdGlvbiByKGUpe2lmKG8oKSxcInN0cmluZ1wiPT10eXBlb2YgZSYmKGU9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlKSksZSYmXCJvYmplY3RcIj09dHlwZW9mIGUmJmUubm9kZVR5cGUpe3ZhciByPW4oZSk7aWYoXCJub25lXCI9PXIuZGlzcGxheSlyZXR1cm4gaSgpO3ZhciBhPXt9O2Eud2lkdGg9ZS5vZmZzZXRXaWR0aCxhLmhlaWdodD1lLm9mZnNldEhlaWdodDtmb3IodmFyIGQ9YS5pc0JvcmRlckJveD1cImJvcmRlci1ib3hcIj09ci5ib3hTaXppbmcsbD0wO3U+bDtsKyspe3ZhciBjPWhbbF0sZj1yW2NdLG09cGFyc2VGbG9hdChmKTthW2NdPWlzTmFOKG0pPzA6bX12YXIgcD1hLnBhZGRpbmdMZWZ0K2EucGFkZGluZ1JpZ2h0LGc9YS5wYWRkaW5nVG9wK2EucGFkZGluZ0JvdHRvbSx5PWEubWFyZ2luTGVmdCthLm1hcmdpblJpZ2h0LHY9YS5tYXJnaW5Ub3ArYS5tYXJnaW5Cb3R0b20sXz1hLmJvcmRlckxlZnRXaWR0aCthLmJvcmRlclJpZ2h0V2lkdGgsej1hLmJvcmRlclRvcFdpZHRoK2EuYm9yZGVyQm90dG9tV2lkdGgsRT1kJiZzLGI9dChyLndpZHRoKTtiIT09ITEmJihhLndpZHRoPWIrKEU/MDpwK18pKTt2YXIgeD10KHIuaGVpZ2h0KTtyZXR1cm4geCE9PSExJiYoYS5oZWlnaHQ9eCsoRT8wOmcreikpLGEuaW5uZXJXaWR0aD1hLndpZHRoLShwK18pLGEuaW5uZXJIZWlnaHQ9YS5oZWlnaHQtKGcreiksYS5vdXRlcldpZHRoPWEud2lkdGgreSxhLm91dGVySGVpZ2h0PWEuaGVpZ2h0K3YsYX19dmFyIHMsYT1cInVuZGVmaW5lZFwiPT10eXBlb2YgY29uc29sZT9lOmZ1bmN0aW9uKHQpe2NvbnNvbGUuZXJyb3IodCl9LGg9W1wicGFkZGluZ0xlZnRcIixcInBhZGRpbmdSaWdodFwiLFwicGFkZGluZ1RvcFwiLFwicGFkZGluZ0JvdHRvbVwiLFwibWFyZ2luTGVmdFwiLFwibWFyZ2luUmlnaHRcIixcIm1hcmdpblRvcFwiLFwibWFyZ2luQm90dG9tXCIsXCJib3JkZXJMZWZ0V2lkdGhcIixcImJvcmRlclJpZ2h0V2lkdGhcIixcImJvcmRlclRvcFdpZHRoXCIsXCJib3JkZXJCb3R0b21XaWR0aFwiXSx1PWgubGVuZ3RoLGQ9ITE7cmV0dXJuIHJ9KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yL21hdGNoZXMtc2VsZWN0b3JcIixlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKCk6dC5tYXRjaGVzU2VsZWN0b3I9ZSgpfSh3aW5kb3csZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjt2YXIgdD1mdW5jdGlvbigpe3ZhciB0PXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZTtpZih0Lm1hdGNoZXMpcmV0dXJuXCJtYXRjaGVzXCI7aWYodC5tYXRjaGVzU2VsZWN0b3IpcmV0dXJuXCJtYXRjaGVzU2VsZWN0b3JcIjtmb3IodmFyIGU9W1wid2Via2l0XCIsXCJtb3pcIixcIm1zXCIsXCJvXCJdLGk9MDtpPGUubGVuZ3RoO2krKyl7dmFyIG49ZVtpXSxvPW4rXCJNYXRjaGVzU2VsZWN0b3JcIjtpZih0W29dKXJldHVybiBvfX0oKTtyZXR1cm4gZnVuY3Rpb24oZSxpKXtyZXR1cm4gZVt0XShpKX19KSxmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJmaXp6eS11aS11dGlscy91dGlsc1wiLFtcImRlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3IvbWF0Y2hlcy1zZWxlY3RvclwiXSxmdW5jdGlvbihpKXtyZXR1cm4gZSh0LGkpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSh0LHJlcXVpcmUoXCJkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yXCIpKTp0LmZpenp5VUlVdGlscz1lKHQsdC5tYXRjaGVzU2VsZWN0b3IpfSh3aW5kb3csZnVuY3Rpb24odCxlKXt2YXIgaT17fTtpLmV4dGVuZD1mdW5jdGlvbih0LGUpe2Zvcih2YXIgaSBpbiBlKXRbaV09ZVtpXTtyZXR1cm4gdH0saS5tb2R1bG89ZnVuY3Rpb24odCxlKXtyZXR1cm4odCVlK2UpJWV9LGkubWFrZUFycmF5PWZ1bmN0aW9uKHQpe3ZhciBlPVtdO2lmKEFycmF5LmlzQXJyYXkodCkpZT10O2Vsc2UgaWYodCYmXCJvYmplY3RcIj09dHlwZW9mIHQmJlwibnVtYmVyXCI9PXR5cGVvZiB0Lmxlbmd0aClmb3IodmFyIGk9MDtpPHQubGVuZ3RoO2krKyllLnB1c2godFtpXSk7ZWxzZSBlLnB1c2godCk7cmV0dXJuIGV9LGkucmVtb3ZlRnJvbT1mdW5jdGlvbih0LGUpe3ZhciBpPXQuaW5kZXhPZihlKTstMSE9aSYmdC5zcGxpY2UoaSwxKX0saS5nZXRQYXJlbnQ9ZnVuY3Rpb24odCxpKXtmb3IoO3QhPWRvY3VtZW50LmJvZHk7KWlmKHQ9dC5wYXJlbnROb2RlLGUodCxpKSlyZXR1cm4gdH0saS5nZXRRdWVyeUVsZW1lbnQ9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/ZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0KTp0fSxpLmhhbmRsZUV2ZW50PWZ1bmN0aW9uKHQpe3ZhciBlPVwib25cIit0LnR5cGU7dGhpc1tlXSYmdGhpc1tlXSh0KX0saS5maWx0ZXJGaW5kRWxlbWVudHM9ZnVuY3Rpb24odCxuKXt0PWkubWFrZUFycmF5KHQpO3ZhciBvPVtdO3JldHVybiB0LmZvckVhY2goZnVuY3Rpb24odCl7aWYodCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KXtpZighbilyZXR1cm4gdm9pZCBvLnB1c2godCk7ZSh0LG4pJiZvLnB1c2godCk7Zm9yKHZhciBpPXQucXVlcnlTZWxlY3RvckFsbChuKSxyPTA7cjxpLmxlbmd0aDtyKyspby5wdXNoKGlbcl0pfX0pLG99LGkuZGVib3VuY2VNZXRob2Q9ZnVuY3Rpb24odCxlLGkpe3ZhciBuPXQucHJvdG90eXBlW2VdLG89ZStcIlRpbWVvdXRcIjt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbigpe3ZhciB0PXRoaXNbb107dCYmY2xlYXJUaW1lb3V0KHQpO3ZhciBlPWFyZ3VtZW50cyxyPXRoaXM7dGhpc1tvXT1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bi5hcHBseShyLGUpLGRlbGV0ZSByW29dfSxpfHwxMDApfX0saS5kb2NSZWFkeT1mdW5jdGlvbih0KXt2YXIgZT1kb2N1bWVudC5yZWFkeVN0YXRlO1wiY29tcGxldGVcIj09ZXx8XCJpbnRlcmFjdGl2ZVwiPT1lP3NldFRpbWVvdXQodCk6ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIix0KX0saS50b0Rhc2hlZD1mdW5jdGlvbih0KXtyZXR1cm4gdC5yZXBsYWNlKC8oLikoW0EtWl0pL2csZnVuY3Rpb24odCxlLGkpe3JldHVybiBlK1wiLVwiK2l9KS50b0xvd2VyQ2FzZSgpfTt2YXIgbj10LmNvbnNvbGU7cmV0dXJuIGkuaHRtbEluaXQ9ZnVuY3Rpb24oZSxvKXtpLmRvY1JlYWR5KGZ1bmN0aW9uKCl7dmFyIHI9aS50b0Rhc2hlZChvKSxzPVwiZGF0YS1cIityLGE9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIltcIitzK1wiXVwiKSxoPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuanMtXCIrciksdT1pLm1ha2VBcnJheShhKS5jb25jYXQoaS5tYWtlQXJyYXkoaCkpLGQ9cytcIi1vcHRpb25zXCIsbD10LmpRdWVyeTt1LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIGkscj10LmdldEF0dHJpYnV0ZShzKXx8dC5nZXRBdHRyaWJ1dGUoZCk7dHJ5e2k9ciYmSlNPTi5wYXJzZShyKX1jYXRjaChhKXtyZXR1cm4gdm9pZChuJiZuLmVycm9yKFwiRXJyb3IgcGFyc2luZyBcIitzK1wiIG9uIFwiK3QuY2xhc3NOYW1lK1wiOiBcIithKSl9dmFyIGg9bmV3IGUodCxpKTtsJiZsLmRhdGEodCxvLGgpfSl9KX0saX0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcIm91dGxheWVyL2l0ZW1cIixbXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixcImdldC1zaXplL2dldC1zaXplXCJdLGUpOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUocmVxdWlyZShcImV2LWVtaXR0ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpKToodC5PdXRsYXllcj17fSx0Lk91dGxheWVyLkl0ZW09ZSh0LkV2RW1pdHRlcix0LmdldFNpemUpKX0od2luZG93LGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gaSh0KXtmb3IodmFyIGUgaW4gdClyZXR1cm4hMTtyZXR1cm4gZT1udWxsLCEwfWZ1bmN0aW9uIG4odCxlKXt0JiYodGhpcy5lbGVtZW50PXQsdGhpcy5sYXlvdXQ9ZSx0aGlzLnBvc2l0aW9uPXt4OjAseTowfSx0aGlzLl9jcmVhdGUoKSl9ZnVuY3Rpb24gbyh0KXtyZXR1cm4gdC5yZXBsYWNlKC8oW0EtWl0pL2csZnVuY3Rpb24odCl7cmV0dXJuXCItXCIrdC50b0xvd2VyQ2FzZSgpfSl9dmFyIHI9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLHM9XCJzdHJpbmdcIj09dHlwZW9mIHIudHJhbnNpdGlvbj9cInRyYW5zaXRpb25cIjpcIldlYmtpdFRyYW5zaXRpb25cIixhPVwic3RyaW5nXCI9PXR5cGVvZiByLnRyYW5zZm9ybT9cInRyYW5zZm9ybVwiOlwiV2Via2l0VHJhbnNmb3JtXCIsaD17V2Via2l0VHJhbnNpdGlvbjpcIndlYmtpdFRyYW5zaXRpb25FbmRcIix0cmFuc2l0aW9uOlwidHJhbnNpdGlvbmVuZFwifVtzXSx1PXt0cmFuc2Zvcm06YSx0cmFuc2l0aW9uOnMsdHJhbnNpdGlvbkR1cmF0aW9uOnMrXCJEdXJhdGlvblwiLHRyYW5zaXRpb25Qcm9wZXJ0eTpzK1wiUHJvcGVydHlcIix0cmFuc2l0aW9uRGVsYXk6cytcIkRlbGF5XCJ9LGQ9bi5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZSh0LnByb3RvdHlwZSk7ZC5jb25zdHJ1Y3Rvcj1uLGQuX2NyZWF0ZT1mdW5jdGlvbigpe3RoaXMuX3RyYW5zbj17aW5nUHJvcGVydGllczp7fSxjbGVhbjp7fSxvbkVuZDp7fX0sdGhpcy5jc3Moe3Bvc2l0aW9uOlwiYWJzb2x1dGVcIn0pfSxkLmhhbmRsZUV2ZW50PWZ1bmN0aW9uKHQpe3ZhciBlPVwib25cIit0LnR5cGU7dGhpc1tlXSYmdGhpc1tlXSh0KX0sZC5nZXRTaXplPWZ1bmN0aW9uKCl7dGhpcy5zaXplPWUodGhpcy5lbGVtZW50KX0sZC5jc3M9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5lbGVtZW50LnN0eWxlO2Zvcih2YXIgaSBpbiB0KXt2YXIgbj11W2ldfHxpO2Vbbl09dFtpXX19LGQuZ2V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgdD1nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWxlbWVudCksZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxpPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIiksbj10W2U/XCJsZWZ0XCI6XCJyaWdodFwiXSxvPXRbaT9cInRvcFwiOlwiYm90dG9tXCJdLHI9dGhpcy5sYXlvdXQuc2l6ZSxzPS0xIT1uLmluZGV4T2YoXCIlXCIpP3BhcnNlRmxvYXQobikvMTAwKnIud2lkdGg6cGFyc2VJbnQobiwxMCksYT0tMSE9by5pbmRleE9mKFwiJVwiKT9wYXJzZUZsb2F0KG8pLzEwMCpyLmhlaWdodDpwYXJzZUludChvLDEwKTtzPWlzTmFOKHMpPzA6cyxhPWlzTmFOKGEpPzA6YSxzLT1lP3IucGFkZGluZ0xlZnQ6ci5wYWRkaW5nUmlnaHQsYS09aT9yLnBhZGRpbmdUb3A6ci5wYWRkaW5nQm90dG9tLHRoaXMucG9zaXRpb24ueD1zLHRoaXMucG9zaXRpb24ueT1hfSxkLmxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5sYXlvdXQuc2l6ZSxlPXt9LGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIiksbj10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpLG89aT9cInBhZGRpbmdMZWZ0XCI6XCJwYWRkaW5nUmlnaHRcIixyPWk/XCJsZWZ0XCI6XCJyaWdodFwiLHM9aT9cInJpZ2h0XCI6XCJsZWZ0XCIsYT10aGlzLnBvc2l0aW9uLngrdFtvXTtlW3JdPXRoaXMuZ2V0WFZhbHVlKGEpLGVbc109XCJcIjt2YXIgaD1uP1wicGFkZGluZ1RvcFwiOlwicGFkZGluZ0JvdHRvbVwiLHU9bj9cInRvcFwiOlwiYm90dG9tXCIsZD1uP1wiYm90dG9tXCI6XCJ0b3BcIixsPXRoaXMucG9zaXRpb24ueSt0W2hdO2VbdV09dGhpcy5nZXRZVmFsdWUobCksZVtkXT1cIlwiLHRoaXMuY3NzKGUpLHRoaXMuZW1pdEV2ZW50KFwibGF5b3V0XCIsW3RoaXNdKX0sZC5nZXRYVmFsdWU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcImhvcml6b250YWxcIik7cmV0dXJuIHRoaXMubGF5b3V0Lm9wdGlvbnMucGVyY2VudFBvc2l0aW9uJiYhZT90L3RoaXMubGF5b3V0LnNpemUud2lkdGgqMTAwK1wiJVwiOnQrXCJweFwifSxkLmdldFlWYWx1ZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwiaG9yaXpvbnRhbFwiKTtyZXR1cm4gdGhpcy5sYXlvdXQub3B0aW9ucy5wZXJjZW50UG9zaXRpb24mJmU/dC90aGlzLmxheW91dC5zaXplLmhlaWdodCoxMDArXCIlXCI6dCtcInB4XCJ9LGQuX3RyYW5zaXRpb25Ubz1mdW5jdGlvbih0LGUpe3RoaXMuZ2V0UG9zaXRpb24oKTt2YXIgaT10aGlzLnBvc2l0aW9uLngsbj10aGlzLnBvc2l0aW9uLnksbz1wYXJzZUludCh0LDEwKSxyPXBhcnNlSW50KGUsMTApLHM9bz09PXRoaXMucG9zaXRpb24ueCYmcj09PXRoaXMucG9zaXRpb24ueTtpZih0aGlzLnNldFBvc2l0aW9uKHQsZSkscyYmIXRoaXMuaXNUcmFuc2l0aW9uaW5nKXJldHVybiB2b2lkIHRoaXMubGF5b3V0UG9zaXRpb24oKTt2YXIgYT10LWksaD1lLW4sdT17fTt1LnRyYW5zZm9ybT10aGlzLmdldFRyYW5zbGF0ZShhLGgpLHRoaXMudHJhbnNpdGlvbih7dG86dSxvblRyYW5zaXRpb25FbmQ6e3RyYW5zZm9ybTp0aGlzLmxheW91dFBvc2l0aW9ufSxpc0NsZWFuaW5nOiEwfSl9LGQuZ2V0VHJhbnNsYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIiksbj10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpO3JldHVybiB0PWk/dDotdCxlPW4/ZTotZSxcInRyYW5zbGF0ZTNkKFwiK3QrXCJweCwgXCIrZStcInB4LCAwKVwifSxkLmdvVG89ZnVuY3Rpb24odCxlKXt0aGlzLnNldFBvc2l0aW9uKHQsZSksdGhpcy5sYXlvdXRQb3NpdGlvbigpfSxkLm1vdmVUbz1kLl90cmFuc2l0aW9uVG8sZC5zZXRQb3NpdGlvbj1mdW5jdGlvbih0LGUpe3RoaXMucG9zaXRpb24ueD1wYXJzZUludCh0LDEwKSx0aGlzLnBvc2l0aW9uLnk9cGFyc2VJbnQoZSwxMCl9LGQuX25vblRyYW5zaXRpb249ZnVuY3Rpb24odCl7dGhpcy5jc3ModC50byksdC5pc0NsZWFuaW5nJiZ0aGlzLl9yZW1vdmVTdHlsZXModC50byk7Zm9yKHZhciBlIGluIHQub25UcmFuc2l0aW9uRW5kKXQub25UcmFuc2l0aW9uRW5kW2VdLmNhbGwodGhpcyl9LGQudHJhbnNpdGlvbj1mdW5jdGlvbih0KXtpZighcGFyc2VGbG9hdCh0aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbikpcmV0dXJuIHZvaWQgdGhpcy5fbm9uVHJhbnNpdGlvbih0KTt2YXIgZT10aGlzLl90cmFuc247Zm9yKHZhciBpIGluIHQub25UcmFuc2l0aW9uRW5kKWUub25FbmRbaV09dC5vblRyYW5zaXRpb25FbmRbaV07Zm9yKGkgaW4gdC50byllLmluZ1Byb3BlcnRpZXNbaV09ITAsdC5pc0NsZWFuaW5nJiYoZS5jbGVhbltpXT0hMCk7aWYodC5mcm9tKXt0aGlzLmNzcyh0LmZyb20pO3ZhciBuPXRoaXMuZWxlbWVudC5vZmZzZXRIZWlnaHQ7bj1udWxsfXRoaXMuZW5hYmxlVHJhbnNpdGlvbih0LnRvKSx0aGlzLmNzcyh0LnRvKSx0aGlzLmlzVHJhbnNpdGlvbmluZz0hMH07dmFyIGw9XCJvcGFjaXR5LFwiK28oYSk7ZC5lbmFibGVUcmFuc2l0aW9uPWZ1bmN0aW9uKCl7aWYoIXRoaXMuaXNUcmFuc2l0aW9uaW5nKXt2YXIgdD10aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbjt0PVwibnVtYmVyXCI9PXR5cGVvZiB0P3QrXCJtc1wiOnQsdGhpcy5jc3Moe3RyYW5zaXRpb25Qcm9wZXJ0eTpsLHRyYW5zaXRpb25EdXJhdGlvbjp0LHRyYW5zaXRpb25EZWxheTp0aGlzLnN0YWdnZXJEZWxheXx8MH0pLHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGgsdGhpcywhMSl9fSxkLm9ud2Via2l0VHJhbnNpdGlvbkVuZD1mdW5jdGlvbih0KXt0aGlzLm9udHJhbnNpdGlvbmVuZCh0KX0sZC5vbm90cmFuc2l0aW9uZW5kPWZ1bmN0aW9uKHQpe3RoaXMub250cmFuc2l0aW9uZW5kKHQpfTt2YXIgYz17XCItd2Via2l0LXRyYW5zZm9ybVwiOlwidHJhbnNmb3JtXCJ9O2Qub250cmFuc2l0aW9uZW5kPWZ1bmN0aW9uKHQpe2lmKHQudGFyZ2V0PT09dGhpcy5lbGVtZW50KXt2YXIgZT10aGlzLl90cmFuc24sbj1jW3QucHJvcGVydHlOYW1lXXx8dC5wcm9wZXJ0eU5hbWU7aWYoZGVsZXRlIGUuaW5nUHJvcGVydGllc1tuXSxpKGUuaW5nUHJvcGVydGllcykmJnRoaXMuZGlzYWJsZVRyYW5zaXRpb24oKSxuIGluIGUuY2xlYW4mJih0aGlzLmVsZW1lbnQuc3R5bGVbdC5wcm9wZXJ0eU5hbWVdPVwiXCIsZGVsZXRlIGUuY2xlYW5bbl0pLG4gaW4gZS5vbkVuZCl7dmFyIG89ZS5vbkVuZFtuXTtvLmNhbGwodGhpcyksZGVsZXRlIGUub25FbmRbbl19dGhpcy5lbWl0RXZlbnQoXCJ0cmFuc2l0aW9uRW5kXCIsW3RoaXNdKX19LGQuZGlzYWJsZVRyYW5zaXRpb249ZnVuY3Rpb24oKXt0aGlzLnJlbW92ZVRyYW5zaXRpb25TdHlsZXMoKSx0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihoLHRoaXMsITEpLHRoaXMuaXNUcmFuc2l0aW9uaW5nPSExfSxkLl9yZW1vdmVTdHlsZXM9ZnVuY3Rpb24odCl7dmFyIGU9e307Zm9yKHZhciBpIGluIHQpZVtpXT1cIlwiO3RoaXMuY3NzKGUpfTt2YXIgZj17dHJhbnNpdGlvblByb3BlcnR5OlwiXCIsdHJhbnNpdGlvbkR1cmF0aW9uOlwiXCIsdHJhbnNpdGlvbkRlbGF5OlwiXCJ9O3JldHVybiBkLnJlbW92ZVRyYW5zaXRpb25TdHlsZXM9ZnVuY3Rpb24oKXt0aGlzLmNzcyhmKX0sZC5zdGFnZ2VyPWZ1bmN0aW9uKHQpe3Q9aXNOYU4odCk/MDp0LHRoaXMuc3RhZ2dlckRlbGF5PXQrXCJtc1wifSxkLnJlbW92ZUVsZW09ZnVuY3Rpb24oKXt0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpLHRoaXMuY3NzKHtkaXNwbGF5OlwiXCJ9KSx0aGlzLmVtaXRFdmVudChcInJlbW92ZVwiLFt0aGlzXSl9LGQucmVtb3ZlPWZ1bmN0aW9uKCl7cmV0dXJuIHMmJnBhcnNlRmxvYXQodGhpcy5sYXlvdXQub3B0aW9ucy50cmFuc2l0aW9uRHVyYXRpb24pPyh0aGlzLm9uY2UoXCJ0cmFuc2l0aW9uRW5kXCIsZnVuY3Rpb24oKXt0aGlzLnJlbW92ZUVsZW0oKX0pLHZvaWQgdGhpcy5oaWRlKCkpOnZvaWQgdGhpcy5yZW1vdmVFbGVtKCl9LGQucmV2ZWFsPWZ1bmN0aW9uKCl7ZGVsZXRlIHRoaXMuaXNIaWRkZW4sdGhpcy5jc3Moe2Rpc3BsYXk6XCJcIn0pO3ZhciB0PXRoaXMubGF5b3V0Lm9wdGlvbnMsZT17fSxpPXRoaXMuZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eShcInZpc2libGVTdHlsZVwiKTtlW2ldPXRoaXMub25SZXZlYWxUcmFuc2l0aW9uRW5kLHRoaXMudHJhbnNpdGlvbih7ZnJvbTp0LmhpZGRlblN0eWxlLHRvOnQudmlzaWJsZVN0eWxlLGlzQ2xlYW5pbmc6ITAsb25UcmFuc2l0aW9uRW5kOmV9KX0sZC5vblJldmVhbFRyYW5zaXRpb25FbmQ9ZnVuY3Rpb24oKXt0aGlzLmlzSGlkZGVufHx0aGlzLmVtaXRFdmVudChcInJldmVhbFwiKX0sZC5nZXRIaWRlUmV2ZWFsVHJhbnNpdGlvbkVuZFByb3BlcnR5PWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMubGF5b3V0Lm9wdGlvbnNbdF07aWYoZS5vcGFjaXR5KXJldHVyblwib3BhY2l0eVwiO2Zvcih2YXIgaSBpbiBlKXJldHVybiBpfSxkLmhpZGU9ZnVuY3Rpb24oKXt0aGlzLmlzSGlkZGVuPSEwLHRoaXMuY3NzKHtkaXNwbGF5OlwiXCJ9KTt2YXIgdD10aGlzLmxheW91dC5vcHRpb25zLGU9e30saT10aGlzLmdldEhpZGVSZXZlYWxUcmFuc2l0aW9uRW5kUHJvcGVydHkoXCJoaWRkZW5TdHlsZVwiKTtlW2ldPXRoaXMub25IaWRlVHJhbnNpdGlvbkVuZCx0aGlzLnRyYW5zaXRpb24oe2Zyb206dC52aXNpYmxlU3R5bGUsdG86dC5oaWRkZW5TdHlsZSxpc0NsZWFuaW5nOiEwLG9uVHJhbnNpdGlvbkVuZDplfSl9LGQub25IaWRlVHJhbnNpdGlvbkVuZD1mdW5jdGlvbigpe3RoaXMuaXNIaWRkZW4mJih0aGlzLmNzcyh7ZGlzcGxheTpcIm5vbmVcIn0pLHRoaXMuZW1pdEV2ZW50KFwiaGlkZVwiKSl9LGQuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuY3NzKHtwb3NpdGlvbjpcIlwiLGxlZnQ6XCJcIixyaWdodDpcIlwiLHRvcDpcIlwiLGJvdHRvbTpcIlwiLHRyYW5zaXRpb246XCJcIix0cmFuc2Zvcm06XCJcIn0pfSxufSksZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwib3V0bGF5ZXIvb3V0bGF5ZXJcIixbXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixcImdldC1zaXplL2dldC1zaXplXCIsXCJmaXp6eS11aS11dGlscy91dGlsc1wiLFwiLi9pdGVtXCJdLGZ1bmN0aW9uKGksbixvLHIpe3JldHVybiBlKHQsaSxuLG8scil9KTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHQscmVxdWlyZShcImV2LWVtaXR0ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpLHJlcXVpcmUoXCJmaXp6eS11aS11dGlsc1wiKSxyZXF1aXJlKFwiLi9pdGVtXCIpKTp0Lk91dGxheWVyPWUodCx0LkV2RW1pdHRlcix0LmdldFNpemUsdC5maXp6eVVJVXRpbHMsdC5PdXRsYXllci5JdGVtKX0od2luZG93LGZ1bmN0aW9uKHQsZSxpLG4sbyl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gcih0LGUpe3ZhciBpPW4uZ2V0UXVlcnlFbGVtZW50KHQpO2lmKCFpKXJldHVybiB2b2lkKGgmJmguZXJyb3IoXCJCYWQgZWxlbWVudCBmb3IgXCIrdGhpcy5jb25zdHJ1Y3Rvci5uYW1lc3BhY2UrXCI6IFwiKyhpfHx0KSkpO3RoaXMuZWxlbWVudD1pLHUmJih0aGlzLiRlbGVtZW50PXUodGhpcy5lbGVtZW50KSksdGhpcy5vcHRpb25zPW4uZXh0ZW5kKHt9LHRoaXMuY29uc3RydWN0b3IuZGVmYXVsdHMpLHRoaXMub3B0aW9uKGUpO3ZhciBvPSsrbDt0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEPW8sY1tvXT10aGlzLHRoaXMuX2NyZWF0ZSgpO3ZhciByPXRoaXMuX2dldE9wdGlvbihcImluaXRMYXlvdXRcIik7ciYmdGhpcy5sYXlvdXQoKX1mdW5jdGlvbiBzKHQpe2Z1bmN0aW9uIGUoKXt0LmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZSh0LnByb3RvdHlwZSksZS5wcm90b3R5cGUuY29uc3RydWN0b3I9ZSxlfWZ1bmN0aW9uIGEodCl7aWYoXCJudW1iZXJcIj09dHlwZW9mIHQpcmV0dXJuIHQ7dmFyIGU9dC5tYXRjaCgvKF5cXGQqXFwuP1xcZCopKFxcdyopLyksaT1lJiZlWzFdLG49ZSYmZVsyXTtpZighaS5sZW5ndGgpcmV0dXJuIDA7aT1wYXJzZUZsb2F0KGkpO3ZhciBvPW1bbl18fDE7cmV0dXJuIGkqb312YXIgaD10LmNvbnNvbGUsdT10LmpRdWVyeSxkPWZ1bmN0aW9uKCl7fSxsPTAsYz17fTtyLm5hbWVzcGFjZT1cIm91dGxheWVyXCIsci5JdGVtPW8sci5kZWZhdWx0cz17Y29udGFpbmVyU3R5bGU6e3Bvc2l0aW9uOlwicmVsYXRpdmVcIn0saW5pdExheW91dDohMCxvcmlnaW5MZWZ0OiEwLG9yaWdpblRvcDohMCxyZXNpemU6ITAscmVzaXplQ29udGFpbmVyOiEwLHRyYW5zaXRpb25EdXJhdGlvbjpcIjAuNHNcIixoaWRkZW5TdHlsZTp7b3BhY2l0eTowLHRyYW5zZm9ybTpcInNjYWxlKDAuMDAxKVwifSx2aXNpYmxlU3R5bGU6e29wYWNpdHk6MSx0cmFuc2Zvcm06XCJzY2FsZSgxKVwifX07dmFyIGY9ci5wcm90b3R5cGU7bi5leHRlbmQoZixlLnByb3RvdHlwZSksZi5vcHRpb249ZnVuY3Rpb24odCl7bi5leHRlbmQodGhpcy5vcHRpb25zLHQpfSxmLl9nZXRPcHRpb249ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5jb25zdHJ1Y3Rvci5jb21wYXRPcHRpb25zW3RdO3JldHVybiBlJiZ2b2lkIDAhPT10aGlzLm9wdGlvbnNbZV0/dGhpcy5vcHRpb25zW2VdOnRoaXMub3B0aW9uc1t0XX0sci5jb21wYXRPcHRpb25zPXtpbml0TGF5b3V0OlwiaXNJbml0TGF5b3V0XCIsaG9yaXpvbnRhbDpcImlzSG9yaXpvbnRhbFwiLGxheW91dEluc3RhbnQ6XCJpc0xheW91dEluc3RhbnRcIixvcmlnaW5MZWZ0OlwiaXNPcmlnaW5MZWZ0XCIsb3JpZ2luVG9wOlwiaXNPcmlnaW5Ub3BcIixyZXNpemU6XCJpc1Jlc2l6ZUJvdW5kXCIscmVzaXplQ29udGFpbmVyOlwiaXNSZXNpemluZ0NvbnRhaW5lclwifSxmLl9jcmVhdGU9ZnVuY3Rpb24oKXt0aGlzLnJlbG9hZEl0ZW1zKCksdGhpcy5zdGFtcHM9W10sdGhpcy5zdGFtcCh0aGlzLm9wdGlvbnMuc3RhbXApLG4uZXh0ZW5kKHRoaXMuZWxlbWVudC5zdHlsZSx0aGlzLm9wdGlvbnMuY29udGFpbmVyU3R5bGUpO3ZhciB0PXRoaXMuX2dldE9wdGlvbihcInJlc2l6ZVwiKTt0JiZ0aGlzLmJpbmRSZXNpemUoKX0sZi5yZWxvYWRJdGVtcz1mdW5jdGlvbigpe3RoaXMuaXRlbXM9dGhpcy5faXRlbWl6ZSh0aGlzLmVsZW1lbnQuY2hpbGRyZW4pfSxmLl9pdGVtaXplPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT10aGlzLl9maWx0ZXJGaW5kSXRlbUVsZW1lbnRzKHQpLGk9dGhpcy5jb25zdHJ1Y3Rvci5JdGVtLG49W10sbz0wO288ZS5sZW5ndGg7bysrKXt2YXIgcj1lW29dLHM9bmV3IGkocix0aGlzKTtuLnB1c2gocyl9cmV0dXJuIG59LGYuX2ZpbHRlckZpbmRJdGVtRWxlbWVudHM9ZnVuY3Rpb24odCl7cmV0dXJuIG4uZmlsdGVyRmluZEVsZW1lbnRzKHQsdGhpcy5vcHRpb25zLml0ZW1TZWxlY3Rvcil9LGYuZ2V0SXRlbUVsZW1lbnRzPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXRlbXMubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0LmVsZW1lbnR9KX0sZi5sYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLl9yZXNldExheW91dCgpLHRoaXMuX21hbmFnZVN0YW1wcygpO3ZhciB0PXRoaXMuX2dldE9wdGlvbihcImxheW91dEluc3RhbnRcIiksZT12b2lkIDAhPT10P3Q6IXRoaXMuX2lzTGF5b3V0SW5pdGVkO3RoaXMubGF5b3V0SXRlbXModGhpcy5pdGVtcyxlKSx0aGlzLl9pc0xheW91dEluaXRlZD0hMH0sZi5faW5pdD1mLmxheW91dCxmLl9yZXNldExheW91dD1mdW5jdGlvbigpe3RoaXMuZ2V0U2l6ZSgpfSxmLmdldFNpemU9ZnVuY3Rpb24oKXt0aGlzLnNpemU9aSh0aGlzLmVsZW1lbnQpfSxmLl9nZXRNZWFzdXJlbWVudD1mdW5jdGlvbih0LGUpe3ZhciBuLG89dGhpcy5vcHRpb25zW3RdO28/KFwic3RyaW5nXCI9PXR5cGVvZiBvP249dGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3Iobyk6byBpbnN0YW5jZW9mIEhUTUxFbGVtZW50JiYobj1vKSx0aGlzW3RdPW4/aShuKVtlXTpvKTp0aGlzW3RdPTB9LGYubGF5b3V0SXRlbXM9ZnVuY3Rpb24odCxlKXt0PXRoaXMuX2dldEl0ZW1zRm9yTGF5b3V0KHQpLHRoaXMuX2xheW91dEl0ZW1zKHQsZSksdGhpcy5fcG9zdExheW91dCgpfSxmLl9nZXRJdGVtc0ZvckxheW91dD1mdW5jdGlvbih0KXtyZXR1cm4gdC5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIXQuaXNJZ25vcmVkfSl9LGYuX2xheW91dEl0ZW1zPWZ1bmN0aW9uKHQsZSl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcImxheW91dFwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgaT1bXTt0LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIG49dGhpcy5fZ2V0SXRlbUxheW91dFBvc2l0aW9uKHQpO24uaXRlbT10LG4uaXNJbnN0YW50PWV8fHQuaXNMYXlvdXRJbnN0YW50LGkucHVzaChuKX0sdGhpcyksdGhpcy5fcHJvY2Vzc0xheW91dFF1ZXVlKGkpfX0sZi5fZ2V0SXRlbUxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKCl7cmV0dXJue3g6MCx5OjB9fSxmLl9wcm9jZXNzTGF5b3V0UXVldWU9ZnVuY3Rpb24odCl7dGhpcy51cGRhdGVTdGFnZ2VyKCksdC5mb3JFYWNoKGZ1bmN0aW9uKHQsZSl7dGhpcy5fcG9zaXRpb25JdGVtKHQuaXRlbSx0LngsdC55LHQuaXNJbnN0YW50LGUpfSx0aGlzKX0sZi51cGRhdGVTdGFnZ2VyPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5vcHRpb25zLnN0YWdnZXI7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P3ZvaWQodGhpcy5zdGFnZ2VyPTApOih0aGlzLnN0YWdnZXI9YSh0KSx0aGlzLnN0YWdnZXIpfSxmLl9wb3NpdGlvbkl0ZW09ZnVuY3Rpb24odCxlLGksbixvKXtuP3QuZ29UbyhlLGkpOih0LnN0YWdnZXIobyp0aGlzLnN0YWdnZXIpLHQubW92ZVRvKGUsaSkpfSxmLl9wb3N0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5yZXNpemVDb250YWluZXIoKX0sZi5yZXNpemVDb250YWluZXI9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJyZXNpemVDb250YWluZXJcIik7aWYodCl7dmFyIGU9dGhpcy5fZ2V0Q29udGFpbmVyU2l6ZSgpO2UmJih0aGlzLl9zZXRDb250YWluZXJNZWFzdXJlKGUud2lkdGgsITApLHRoaXMuX3NldENvbnRhaW5lck1lYXN1cmUoZS5oZWlnaHQsITEpKX19LGYuX2dldENvbnRhaW5lclNpemU9ZCxmLl9zZXRDb250YWluZXJNZWFzdXJlPWZ1bmN0aW9uKHQsZSl7aWYodm9pZCAwIT09dCl7dmFyIGk9dGhpcy5zaXplO2kuaXNCb3JkZXJCb3gmJih0Kz1lP2kucGFkZGluZ0xlZnQraS5wYWRkaW5nUmlnaHQraS5ib3JkZXJMZWZ0V2lkdGgraS5ib3JkZXJSaWdodFdpZHRoOmkucGFkZGluZ0JvdHRvbStpLnBhZGRpbmdUb3AraS5ib3JkZXJUb3BXaWR0aCtpLmJvcmRlckJvdHRvbVdpZHRoKSx0PU1hdGgubWF4KHQsMCksdGhpcy5lbGVtZW50LnN0eWxlW2U/XCJ3aWR0aFwiOlwiaGVpZ2h0XCJdPXQrXCJweFwifX0sZi5fZW1pdENvbXBsZXRlT25JdGVtcz1mdW5jdGlvbih0LGUpe2Z1bmN0aW9uIGkoKXtvLmRpc3BhdGNoRXZlbnQodCtcIkNvbXBsZXRlXCIsbnVsbCxbZV0pfWZ1bmN0aW9uIG4oKXtzKysscz09ciYmaSgpfXZhciBvPXRoaXMscj1lLmxlbmd0aDtpZighZXx8IXIpcmV0dXJuIHZvaWQgaSgpO3ZhciBzPTA7ZS5mb3JFYWNoKGZ1bmN0aW9uKGUpe2Uub25jZSh0LG4pfSl9LGYuZGlzcGF0Y2hFdmVudD1mdW5jdGlvbih0LGUsaSl7dmFyIG49ZT9bZV0uY29uY2F0KGkpOmk7aWYodGhpcy5lbWl0RXZlbnQodCxuKSx1KWlmKHRoaXMuJGVsZW1lbnQ9dGhpcy4kZWxlbWVudHx8dSh0aGlzLmVsZW1lbnQpLGUpe3ZhciBvPXUuRXZlbnQoZSk7by50eXBlPXQsdGhpcy4kZWxlbWVudC50cmlnZ2VyKG8saSl9ZWxzZSB0aGlzLiRlbGVtZW50LnRyaWdnZXIodCxpKX0sZi5pZ25vcmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtKHQpO2UmJihlLmlzSWdub3JlZD0hMCl9LGYudW5pZ25vcmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtKHQpO2UmJmRlbGV0ZSBlLmlzSWdub3JlZH0sZi5zdGFtcD1mdW5jdGlvbih0KXt0PXRoaXMuX2ZpbmQodCksdCYmKHRoaXMuc3RhbXBzPXRoaXMuc3RhbXBzLmNvbmNhdCh0KSx0LmZvckVhY2godGhpcy5pZ25vcmUsdGhpcykpfSxmLnVuc3RhbXA9ZnVuY3Rpb24odCl7dD10aGlzLl9maW5kKHQpLHQmJnQuZm9yRWFjaChmdW5jdGlvbih0KXtuLnJlbW92ZUZyb20odGhpcy5zdGFtcHMsdCksdGhpcy51bmlnbm9yZSh0KX0sdGhpcyl9LGYuX2ZpbmQ9ZnVuY3Rpb24odCl7cmV0dXJuIHQ/KFwic3RyaW5nXCI9PXR5cGVvZiB0JiYodD10aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCh0KSksdD1uLm1ha2VBcnJheSh0KSk6dm9pZCAwfSxmLl9tYW5hZ2VTdGFtcHM9ZnVuY3Rpb24oKXt0aGlzLnN0YW1wcyYmdGhpcy5zdGFtcHMubGVuZ3RoJiYodGhpcy5fZ2V0Qm91bmRpbmdSZWN0KCksdGhpcy5zdGFtcHMuZm9yRWFjaCh0aGlzLl9tYW5hZ2VTdGFtcCx0aGlzKSl9LGYuX2dldEJvdW5kaW5nUmVjdD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxlPXRoaXMuc2l6ZTt0aGlzLl9ib3VuZGluZ1JlY3Q9e2xlZnQ6dC5sZWZ0K2UucGFkZGluZ0xlZnQrZS5ib3JkZXJMZWZ0V2lkdGgsdG9wOnQudG9wK2UucGFkZGluZ1RvcCtlLmJvcmRlclRvcFdpZHRoLHJpZ2h0OnQucmlnaHQtKGUucGFkZGluZ1JpZ2h0K2UuYm9yZGVyUmlnaHRXaWR0aCksYm90dG9tOnQuYm90dG9tLShlLnBhZGRpbmdCb3R0b20rZS5ib3JkZXJCb3R0b21XaWR0aCl9fSxmLl9tYW5hZ2VTdGFtcD1kLGYuX2dldEVsZW1lbnRPZmZzZXQ9ZnVuY3Rpb24odCl7dmFyIGU9dC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxuPXRoaXMuX2JvdW5kaW5nUmVjdCxvPWkodCkscj17bGVmdDplLmxlZnQtbi5sZWZ0LW8ubWFyZ2luTGVmdCx0b3A6ZS50b3Atbi50b3Atby5tYXJnaW5Ub3AscmlnaHQ6bi5yaWdodC1lLnJpZ2h0LW8ubWFyZ2luUmlnaHQsYm90dG9tOm4uYm90dG9tLWUuYm90dG9tLW8ubWFyZ2luQm90dG9tfTtyZXR1cm4gcn0sZi5oYW5kbGVFdmVudD1uLmhhbmRsZUV2ZW50LGYuYmluZFJlc2l6ZT1mdW5jdGlvbigpe3QuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMpLHRoaXMuaXNSZXNpemVCb3VuZD0hMH0sZi51bmJpbmRSZXNpemU9ZnVuY3Rpb24oKXt0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzKSx0aGlzLmlzUmVzaXplQm91bmQ9ITF9LGYub25yZXNpemU9ZnVuY3Rpb24oKXt0aGlzLnJlc2l6ZSgpfSxuLmRlYm91bmNlTWV0aG9kKHIsXCJvbnJlc2l6ZVwiLDEwMCksZi5yZXNpemU9ZnVuY3Rpb24oKXt0aGlzLmlzUmVzaXplQm91bmQmJnRoaXMubmVlZHNSZXNpemVMYXlvdXQoKSYmdGhpcy5sYXlvdXQoKX0sZi5uZWVkc1Jlc2l6ZUxheW91dD1mdW5jdGlvbigpe3ZhciB0PWkodGhpcy5lbGVtZW50KSxlPXRoaXMuc2l6ZSYmdDtyZXR1cm4gZSYmdC5pbm5lcldpZHRoIT09dGhpcy5zaXplLmlubmVyV2lkdGh9LGYuYWRkSXRlbXM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5faXRlbWl6ZSh0KTtyZXR1cm4gZS5sZW5ndGgmJih0aGlzLml0ZW1zPXRoaXMuaXRlbXMuY29uY2F0KGUpKSxlfSxmLmFwcGVuZGVkPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuYWRkSXRlbXModCk7ZS5sZW5ndGgmJih0aGlzLmxheW91dEl0ZW1zKGUsITApLHRoaXMucmV2ZWFsKGUpKX0sZi5wcmVwZW5kZWQ9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5faXRlbWl6ZSh0KTtpZihlLmxlbmd0aCl7dmFyIGk9dGhpcy5pdGVtcy5zbGljZSgwKTt0aGlzLml0ZW1zPWUuY29uY2F0KGkpLHRoaXMuX3Jlc2V0TGF5b3V0KCksdGhpcy5fbWFuYWdlU3RhbXBzKCksdGhpcy5sYXlvdXRJdGVtcyhlLCEwKSx0aGlzLnJldmVhbChlKSx0aGlzLmxheW91dEl0ZW1zKGkpfX0sZi5yZXZlYWw9ZnVuY3Rpb24odCl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcInJldmVhbFwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgZT10aGlzLnVwZGF0ZVN0YWdnZXIoKTt0LmZvckVhY2goZnVuY3Rpb24odCxpKXt0LnN0YWdnZXIoaSplKSx0LnJldmVhbCgpfSl9fSxmLmhpZGU9ZnVuY3Rpb24odCl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcImhpZGVcIix0KSx0JiZ0Lmxlbmd0aCl7dmFyIGU9dGhpcy51cGRhdGVTdGFnZ2VyKCk7dC5mb3JFYWNoKGZ1bmN0aW9uKHQsaSl7dC5zdGFnZ2VyKGkqZSksdC5oaWRlKCl9KX19LGYucmV2ZWFsSXRlbUVsZW1lbnRzPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5yZXZlYWwoZSl9LGYuaGlkZUl0ZW1FbGVtZW50cz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW1zKHQpO3RoaXMuaGlkZShlKX0sZi5nZXRJdGVtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wO2U8dGhpcy5pdGVtcy5sZW5ndGg7ZSsrKXt2YXIgaT10aGlzLml0ZW1zW2VdO2lmKGkuZWxlbWVudD09dClyZXR1cm4gaX19LGYuZ2V0SXRlbXM9ZnVuY3Rpb24odCl7dD1uLm1ha2VBcnJheSh0KTt2YXIgZT1bXTtyZXR1cm4gdC5mb3JFYWNoKGZ1bmN0aW9uKHQpe3ZhciBpPXRoaXMuZ2V0SXRlbSh0KTtpJiZlLnB1c2goaSl9LHRoaXMpLGV9LGYucmVtb3ZlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcInJlbW92ZVwiLGUpLGUmJmUubGVuZ3RoJiZlLmZvckVhY2goZnVuY3Rpb24odCl7dC5yZW1vdmUoKSxuLnJlbW92ZUZyb20odGhpcy5pdGVtcyx0KX0sdGhpcyl9LGYuZGVzdHJveT1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZWxlbWVudC5zdHlsZTt0LmhlaWdodD1cIlwiLHQucG9zaXRpb249XCJcIix0LndpZHRoPVwiXCIsdGhpcy5pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKHQpe3QuZGVzdHJveSgpfSksdGhpcy51bmJpbmRSZXNpemUoKTt2YXIgZT10aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEO2RlbGV0ZSBjW2VdLGRlbGV0ZSB0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlELHUmJnUucmVtb3ZlRGF0YSh0aGlzLmVsZW1lbnQsdGhpcy5jb25zdHJ1Y3Rvci5uYW1lc3BhY2UpfSxyLmRhdGE9ZnVuY3Rpb24odCl7dD1uLmdldFF1ZXJ5RWxlbWVudCh0KTt2YXIgZT10JiZ0Lm91dGxheWVyR1VJRDtyZXR1cm4gZSYmY1tlXX0sci5jcmVhdGU9ZnVuY3Rpb24odCxlKXt2YXIgaT1zKHIpO3JldHVybiBpLmRlZmF1bHRzPW4uZXh0ZW5kKHt9LHIuZGVmYXVsdHMpLG4uZXh0ZW5kKGkuZGVmYXVsdHMsZSksaS5jb21wYXRPcHRpb25zPW4uZXh0ZW5kKHt9LHIuY29tcGF0T3B0aW9ucyksaS5uYW1lc3BhY2U9dCxpLmRhdGE9ci5kYXRhLGkuSXRlbT1zKG8pLG4uaHRtbEluaXQoaSx0KSx1JiZ1LmJyaWRnZXQmJnUuYnJpZGdldCh0LGkpLGl9O3ZhciBtPXttczoxLHM6MWUzfTtyZXR1cm4gci5JdGVtPW8scn0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXCJvdXRsYXllci9vdXRsYXllclwiLFwiZ2V0LXNpemUvZ2V0LXNpemVcIl0sZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZShyZXF1aXJlKFwib3V0bGF5ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpKTp0Lk1hc29ucnk9ZSh0Lk91dGxheWVyLHQuZ2V0U2l6ZSl9KHdpbmRvdyxmdW5jdGlvbih0LGUpe3ZhciBpPXQuY3JlYXRlKFwibWFzb25yeVwiKTtpLmNvbXBhdE9wdGlvbnMuZml0V2lkdGg9XCJpc0ZpdFdpZHRoXCI7dmFyIG49aS5wcm90b3R5cGU7cmV0dXJuIG4uX3Jlc2V0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5nZXRTaXplKCksdGhpcy5fZ2V0TWVhc3VyZW1lbnQoXCJjb2x1bW5XaWR0aFwiLFwib3V0ZXJXaWR0aFwiKSx0aGlzLl9nZXRNZWFzdXJlbWVudChcImd1dHRlclwiLFwib3V0ZXJXaWR0aFwiKSx0aGlzLm1lYXN1cmVDb2x1bW5zKCksdGhpcy5jb2xZcz1bXTtmb3IodmFyIHQ9MDt0PHRoaXMuY29sczt0KyspdGhpcy5jb2xZcy5wdXNoKDApO3RoaXMubWF4WT0wLHRoaXMuaG9yaXpvbnRhbENvbEluZGV4PTB9LG4ubWVhc3VyZUNvbHVtbnM9ZnVuY3Rpb24oKXtpZih0aGlzLmdldENvbnRhaW5lcldpZHRoKCksIXRoaXMuY29sdW1uV2lkdGgpe3ZhciB0PXRoaXMuaXRlbXNbMF0saT10JiZ0LmVsZW1lbnQ7dGhpcy5jb2x1bW5XaWR0aD1pJiZlKGkpLm91dGVyV2lkdGh8fHRoaXMuY29udGFpbmVyV2lkdGh9dmFyIG49dGhpcy5jb2x1bW5XaWR0aCs9dGhpcy5ndXR0ZXIsbz10aGlzLmNvbnRhaW5lcldpZHRoK3RoaXMuZ3V0dGVyLHI9by9uLHM9bi1vJW4sYT1zJiYxPnM/XCJyb3VuZFwiOlwiZmxvb3JcIjtyPU1hdGhbYV0ociksdGhpcy5jb2xzPU1hdGgubWF4KHIsMSl9LG4uZ2V0Q29udGFpbmVyV2lkdGg9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJmaXRXaWR0aFwiKSxpPXQ/dGhpcy5lbGVtZW50LnBhcmVudE5vZGU6dGhpcy5lbGVtZW50LG49ZShpKTt0aGlzLmNvbnRhaW5lcldpZHRoPW4mJm4uaW5uZXJXaWR0aH0sbi5fZ2V0SXRlbUxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKHQpe3QuZ2V0U2l6ZSgpO3ZhciBlPXQuc2l6ZS5vdXRlcldpZHRoJXRoaXMuY29sdW1uV2lkdGgsaT1lJiYxPmU/XCJyb3VuZFwiOlwiY2VpbFwiLG49TWF0aFtpXSh0LnNpemUub3V0ZXJXaWR0aC90aGlzLmNvbHVtbldpZHRoKTtuPU1hdGgubWluKG4sdGhpcy5jb2xzKTtmb3IodmFyIG89dGhpcy5vcHRpb25zLmhvcml6b250YWxPcmRlcj9cIl9nZXRIb3Jpem9udGFsQ29sUG9zaXRpb25cIjpcIl9nZXRUb3BDb2xQb3NpdGlvblwiLHI9dGhpc1tvXShuLHQpLHM9e3g6dGhpcy5jb2x1bW5XaWR0aCpyLmNvbCx5OnIueX0sYT1yLnkrdC5zaXplLm91dGVySGVpZ2h0LGg9bityLmNvbCx1PXIuY29sO2g+dTt1KyspdGhpcy5jb2xZc1t1XT1hO3JldHVybiBzfSxuLl9nZXRUb3BDb2xQb3NpdGlvbj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLl9nZXRUb3BDb2xHcm91cCh0KSxpPU1hdGgubWluLmFwcGx5KE1hdGgsZSk7cmV0dXJue2NvbDplLmluZGV4T2YoaSkseTppfX0sbi5fZ2V0VG9wQ29sR3JvdXA9ZnVuY3Rpb24odCl7aWYoMj50KXJldHVybiB0aGlzLmNvbFlzO2Zvcih2YXIgZT1bXSxpPXRoaXMuY29scysxLXQsbj0wO2k+bjtuKyspZVtuXT10aGlzLl9nZXRDb2xHcm91cFkobix0KTtyZXR1cm4gZX0sbi5fZ2V0Q29sR3JvdXBZPWZ1bmN0aW9uKHQsZSl7aWYoMj5lKXJldHVybiB0aGlzLmNvbFlzW3RdO3ZhciBpPXRoaXMuY29sWXMuc2xpY2UodCx0K2UpO3JldHVybiBNYXRoLm1heC5hcHBseShNYXRoLGkpfSxuLl9nZXRIb3Jpem9udGFsQ29sUG9zaXRpb249ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmhvcml6b250YWxDb2xJbmRleCV0aGlzLmNvbHMsbj10PjEmJmkrdD50aGlzLmNvbHM7aT1uPzA6aTt2YXIgbz1lLnNpemUub3V0ZXJXaWR0aCYmZS5zaXplLm91dGVySGVpZ2h0O3JldHVybiB0aGlzLmhvcml6b250YWxDb2xJbmRleD1vP2krdDp0aGlzLmhvcml6b250YWxDb2xJbmRleCx7Y29sOmkseTp0aGlzLl9nZXRDb2xHcm91cFkoaSx0KX19LG4uX21hbmFnZVN0YW1wPWZ1bmN0aW9uKHQpe3ZhciBpPWUodCksbj10aGlzLl9nZXRFbGVtZW50T2Zmc2V0KHQpLG89dGhpcy5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxyPW8/bi5sZWZ0Om4ucmlnaHQscz1yK2kub3V0ZXJXaWR0aCxhPU1hdGguZmxvb3Ioci90aGlzLmNvbHVtbldpZHRoKTthPU1hdGgubWF4KDAsYSk7dmFyIGg9TWF0aC5mbG9vcihzL3RoaXMuY29sdW1uV2lkdGgpO2gtPXMldGhpcy5jb2x1bW5XaWR0aD8wOjEsaD1NYXRoLm1pbih0aGlzLmNvbHMtMSxoKTtmb3IodmFyIHU9dGhpcy5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpLGQ9KHU/bi50b3A6bi5ib3R0b20pK2kub3V0ZXJIZWlnaHQsbD1hO2g+PWw7bCsrKXRoaXMuY29sWXNbbF09TWF0aC5tYXgoZCx0aGlzLmNvbFlzW2xdKX0sbi5fZ2V0Q29udGFpbmVyU2l6ZT1mdW5jdGlvbigpe3RoaXMubWF4WT1NYXRoLm1heC5hcHBseShNYXRoLHRoaXMuY29sWXMpO3ZhciB0PXtoZWlnaHQ6dGhpcy5tYXhZfTtyZXR1cm4gdGhpcy5fZ2V0T3B0aW9uKFwiZml0V2lkdGhcIikmJih0LndpZHRoPXRoaXMuX2dldENvbnRhaW5lckZpdFdpZHRoKCkpLHR9LG4uX2dldENvbnRhaW5lckZpdFdpZHRoPWZ1bmN0aW9uKCl7Zm9yKHZhciB0PTAsZT10aGlzLmNvbHM7LS1lJiYwPT09dGhpcy5jb2xZc1tlXTspdCsrO3JldHVybih0aGlzLmNvbHMtdCkqdGhpcy5jb2x1bW5XaWR0aC10aGlzLmd1dHRlcn0sbi5uZWVkc1Jlc2l6ZUxheW91dD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuY29udGFpbmVyV2lkdGg7cmV0dXJuIHRoaXMuZ2V0Q29udGFpbmVyV2lkdGgoKSx0IT10aGlzLmNvbnRhaW5lcldpZHRofSxpfSk7IiwiXHJcbmZ1bmN0aW9uIHN0YXJGdW5jdGlvbih4LCB5KSB7XHJcblxyXG4gICAgYXBpX3VybCA9ICcvYXBpL3YxL3N0YXIvJyArIHkgKyAnLyc7XHJcblxyXG4gICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJmYS1zdGFyLW9cIikpe1xyXG4gICAgICAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcIm5vdC1sb2dnZWQtaW5cIikpe1xyXG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XHJcbiAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XHJcbiAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmZhZGVJbigpO1xyXG4vLyAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlT3V0KCk7XHJcbiAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyLW9cIilcclxuICAgICAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwiZmEtc3RhclwiKVxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsICAgIC8vWW91ciBhcGkgdXJsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQVVQnLCAgIC8vdHlwZSBpcyBhbnkgSFRUUCBtZXRob2RcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgICAgICAvL0RhdGEgYXMganMgb2JqZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgO1xyXG4gICAgICAgICB9XHJcblxyXG4gICAgfSBlbHNlIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwiZmEtc3RhclwiKSl7XHJcblxyXG4gICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImZhLXN0YXJcIilcclxuICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJmYS1zdGFyLW9cIilcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnREVMRVRFJyxcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICA7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XHJcbiAgJCh0aGlzKS5jbG9zZXN0KCcuY2FyZCcpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcclxuICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZUluKCk7XHJcbn0pIiwiKGZ1bmN0aW9uKCQpe1widXNlIHN0cmljdFwiO3ZhciBNYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24oZWxlbWVudCxvcHRpb25zKXt2YXIgbXM9dGhpczt2YXIgZGVmYXVsdHM9e2FsbG93RnJlZUVudHJpZXM6dHJ1ZSxhbGxvd0R1cGxpY2F0ZXM6ZmFsc2UsYWpheENvbmZpZzp7fSxhdXRvU2VsZWN0OnRydWUsc2VsZWN0Rmlyc3Q6ZmFsc2UscXVlcnlQYXJhbTpcInF1ZXJ5XCIsYmVmb3JlU2VuZDpmdW5jdGlvbigpe30sY2xzOlwiXCIsZGF0YTpudWxsLGRhdGFVcmxQYXJhbXM6e30sZGlzYWJsZWQ6ZmFsc2UsZGlzYWJsZWRGaWVsZDpudWxsLGRpc3BsYXlGaWVsZDpcIm5hbWVcIixlZGl0YWJsZTp0cnVlLGV4cGFuZGVkOmZhbHNlLGV4cGFuZE9uRm9jdXM6ZmFsc2UsZ3JvdXBCeTpudWxsLGhpZGVUcmlnZ2VyOmZhbHNlLGhpZ2hsaWdodDp0cnVlLGlkOm51bGwsaW5mb01zZ0NsczpcIlwiLGlucHV0Q2ZnOnt9LGludmFsaWRDbHM6XCJtcy1pbnZcIixtYXRjaENhc2U6ZmFsc2UsbWF4RHJvcEhlaWdodDoyOTAsbWF4RW50cnlMZW5ndGg6bnVsbCxtYXhFbnRyeVJlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiUGxlYXNlIHJlZHVjZSB5b3VyIGVudHJ5IGJ5IFwiK3YrXCIgY2hhcmFjdGVyXCIrKHY+MT9cInNcIjpcIlwiKX0sbWF4U3VnZ2VzdGlvbnM6bnVsbCxtYXhTZWxlY3Rpb246MTAsbWF4U2VsZWN0aW9uUmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gXCIrditcIiBpdGVtXCIrKHY+MT9cInNcIjpcIlwiKX0sbWV0aG9kOlwiUE9TVFwiLG1pbkNoYXJzOjAsbWluQ2hhcnNSZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIlBsZWFzZSB0eXBlIFwiK3YrXCIgbW9yZSBjaGFyYWN0ZXJcIisodj4xP1wic1wiOlwiXCIpfSxtb2RlOlwibG9jYWxcIixuYW1lOm51bGwsbm9TdWdnZXN0aW9uVGV4dDpcIk5vIHN1Z2dlc3Rpb25zXCIscGxhY2Vob2xkZXI6XCJUeXBlIG9yIGNsaWNrIGhlcmVcIixyZW5kZXJlcjpudWxsLHJlcXVpcmVkOmZhbHNlLHJlc3VsdEFzU3RyaW5nOmZhbHNlLHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOlwiLFwiLHJlc3VsdHNGaWVsZDpcInJlc3VsdHNcIixzZWxlY3Rpb25DbHM6XCJcIixzZWxlY3Rpb25Db250YWluZXI6bnVsbCxzZWxlY3Rpb25Qb3NpdGlvbjpcImlubmVyXCIsc2VsZWN0aW9uUmVuZGVyZXI6bnVsbCxzZWxlY3Rpb25TdGFja2VkOmZhbHNlLHNvcnREaXI6XCJhc2NcIixzb3J0T3JkZXI6bnVsbCxzdHJpY3RTdWdnZXN0OmZhbHNlLHN0eWxlOlwiXCIsdG9nZ2xlT25DbGljazpmYWxzZSx0eXBlRGVsYXk6NDAwLHVzZVRhYktleTpmYWxzZSx1c2VDb21tYUtleTp0cnVlLHVzZVplYnJhU3R5bGU6ZmFsc2UsdmFsdWU6bnVsbCx2YWx1ZUZpZWxkOlwiaWRcIix2cmVnZXg6bnVsbCx2dHlwZTpudWxsfTt2YXIgY29uZj0kLmV4dGVuZCh7fSxvcHRpb25zKTt2YXIgY2ZnPSQuZXh0ZW5kKHRydWUse30sZGVmYXVsdHMsY29uZik7dGhpcy5hZGRUb1NlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyxpc1NpbGVudCl7aWYoIWNmZy5tYXhTZWxlY3Rpb258fF9zZWxlY3Rpb24ubGVuZ3RoPGNmZy5tYXhTZWxlY3Rpb24pe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe2lmKGNmZy5hbGxvd0R1cGxpY2F0ZXN8fCQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKT09PS0xKXtfc2VsZWN0aW9uLnB1c2goanNvbik7dmFsdWVjaGFuZ2VkPXRydWV9fSk7aWYodmFsdWVjaGFuZ2VkPT09dHJ1ZSl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7dGhpcy5lbXB0eSgpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfX19dGhpcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJnRoaXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcil9O3RoaXMuY2xlYXI9ZnVuY3Rpb24oaXNTaWxlbnQpe3RoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbihfc2VsZWN0aW9uLnNsaWNlKDApLGlzU2lsZW50KX07dGhpcy5jb2xsYXBzZT1mdW5jdGlvbigpe2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3RoaXMuY29tYm9ib3guZGV0YWNoKCk7Y2ZnLmV4cGFuZGVkPWZhbHNlOyQodGhpcykudHJpZ2dlcihcImNvbGxhcHNlXCIsW3RoaXNdKX19O3RoaXMuZGlzYWJsZT1mdW5jdGlvbigpe3RoaXMuY29udGFpbmVyLmFkZENsYXNzKFwibXMtY3RuLWRpc2FibGVkXCIpO2NmZy5kaXNhYmxlZD10cnVlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLHRydWUpfTt0aGlzLmVtcHR5PWZ1bmN0aW9uKCl7dGhpcy5pbnB1dC52YWwoXCJcIil9O3RoaXMuZW5hYmxlPWZ1bmN0aW9uKCl7dGhpcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZGlzYWJsZWRcIik7Y2ZnLmRpc2FibGVkPWZhbHNlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLGZhbHNlKX07dGhpcy5leHBhbmQ9ZnVuY3Rpb24oKXtpZighY2ZnLmV4cGFuZGVkJiYodGhpcy5pbnB1dC52YWwoKS5sZW5ndGg+PWNmZy5taW5DaGFyc3x8dGhpcy5jb21ib2JveC5jaGlsZHJlbigpLnNpemUoKT4wKSl7dGhpcy5jb21ib2JveC5hcHBlbmRUbyh0aGlzLmNvbnRhaW5lcik7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7Y2ZnLmV4cGFuZGVkPXRydWU7JCh0aGlzKS50cmlnZ2VyKFwiZXhwYW5kXCIsW3RoaXNdKX19O3RoaXMuaXNEaXNhYmxlZD1mdW5jdGlvbigpe3JldHVybiBjZmcuZGlzYWJsZWR9O3RoaXMuaXNWYWxpZD1mdW5jdGlvbigpe3ZhciB2YWxpZD1jZmcucmVxdWlyZWQ9PT1mYWxzZXx8X3NlbGVjdGlvbi5sZW5ndGg+MDtpZihjZmcudnR5cGV8fGNmZy52cmVnZXgpeyQuZWFjaChfc2VsZWN0aW9uLGZ1bmN0aW9uKGluZGV4LGl0ZW0pe3ZhbGlkPXZhbGlkJiZzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0oaXRlbVtjZmcudmFsdWVGaWVsZF0pfSl9cmV0dXJuIHZhbGlkfTt0aGlzLmdldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXN9O3RoaXMuZ2V0TmFtZT1mdW5jdGlvbigpe3JldHVybiBjZmcubmFtZX07dGhpcy5nZXRTZWxlY3Rpb249ZnVuY3Rpb24oKXtyZXR1cm4gX3NlbGVjdGlvbn07dGhpcy5nZXRSYXdWYWx1ZT1mdW5jdGlvbigpe3JldHVybiBtcy5pbnB1dC52YWwoKX07dGhpcy5nZXRWYWx1ZT1mdW5jdGlvbigpe3JldHVybiAkLm1hcChfc2VsZWN0aW9uLGZ1bmN0aW9uKG8pe3JldHVybiBvW2NmZy52YWx1ZUZpZWxkXX0pfTt0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMsaXNTaWxlbnQpe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe3ZhciBpPSQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKTtpZihpPi0xKXtfc2VsZWN0aW9uLnNwbGljZShpLDEpO3ZhbHVlY2hhbmdlZD10cnVlfX0pO2lmKHZhbHVlY2hhbmdlZD09PXRydWUpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfWlmKGNmZy5leHBhbmRPbkZvY3VzKXttcy5leHBhbmQoKX1pZihjZmcuZXhwYW5kZWQpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfX10aGlzLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKX07dGhpcy5nZXREYXRhPWZ1bmN0aW9uKCl7cmV0dXJuIF9jYkRhdGF9O3RoaXMuc2V0RGF0YT1mdW5jdGlvbihkYXRhKXtjZmcuZGF0YT1kYXRhO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfTt0aGlzLnNldE5hbWU9ZnVuY3Rpb24obmFtZSl7Y2ZnLm5hbWU9bmFtZTtpZihuYW1lKXtjZmcubmFtZSs9bmFtZS5pbmRleE9mKFwiW11cIik+MD9cIlwiOlwiW11cIn1pZihtcy5fdmFsdWVDb250YWluZXIpeyQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSxmdW5jdGlvbihpLGVsKXtlbC5uYW1lPWNmZy5uYW1lfSl9fTt0aGlzLnNldFNlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyl7dGhpcy5jbGVhcigpO3RoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpfTt0aGlzLnNldFZhbHVlPWZ1bmN0aW9uKHZhbHVlcyl7dmFyIGl0ZW1zPVtdOyQuZWFjaCh2YWx1ZXMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBmb3VuZD1mYWxzZTskLmVhY2goX2NiRGF0YSxmdW5jdGlvbihpLGl0ZW0pe2lmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdPT12YWx1ZSl7aXRlbXMucHVzaChpdGVtKTtmb3VuZD10cnVlO3JldHVybiBmYWxzZX19KTtpZighZm91bmQpe2lmKHR5cGVvZiB2YWx1ZT09PVwib2JqZWN0XCIpe2l0ZW1zLnB1c2godmFsdWUpfWVsc2V7dmFyIGpzb249e307anNvbltjZmcudmFsdWVGaWVsZF09dmFsdWU7anNvbltjZmcuZGlzcGxheUZpZWxkXT12YWx1ZTtpdGVtcy5wdXNoKGpzb24pfX19KTtpZihpdGVtcy5sZW5ndGg+MCl7dGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyl9fTt0aGlzLnNldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24ocGFyYW1zKXtjZmcuZGF0YVVybFBhcmFtcz0kLmV4dGVuZCh7fSxwYXJhbXMpfTt2YXIgX3NlbGVjdGlvbj1bXSxfY29tYm9JdGVtSGVpZ2h0PTAsX3RpbWVyLF9oYXNGb2N1cz1mYWxzZSxfZ3JvdXBzPW51bGwsX2NiRGF0YT1bXSxfY3RybERvd249ZmFsc2UsS0VZQ09ERVM9e0JBQ0tTUEFDRTo4LFRBQjo5LEVOVEVSOjEzLENUUkw6MTcsRVNDOjI3LFNQQUNFOjMyLFVQQVJST1c6MzgsRE9XTkFSUk9XOjQwLENPTU1BOjE4OH07dmFyIHNlbGY9e19kaXNwbGF5U3VnZ2VzdGlvbnM6ZnVuY3Rpb24oZGF0YSl7bXMuY29tYm9ib3guc2hvdygpO21zLmNvbWJvYm94LmVtcHR5KCk7dmFyIHJlc0hlaWdodD0wLG5iR3JvdXBzPTA7aWYoX2dyb3Vwcz09PW51bGwpe3NlbGYuX3JlbmRlckNvbWJvSXRlbXMoZGF0YSk7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqZGF0YS5sZW5ndGh9ZWxzZXtmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcyl7bmJHcm91cHMrPTE7JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtZ3JvdXBcIixodG1sOmdycE5hbWV9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7c2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhfZ3JvdXBzW2dycE5hbWVdLml0ZW1zLHRydWUpfXZhciBfZ3JvdXBJdGVtSGVpZ2h0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWdyb3VwXCIpLm91dGVySGVpZ2h0KCk7aWYoX2dyb3VwSXRlbUhlaWdodCE9PW51bGwpe3ZhciB0bXBSZXNIZWlnaHQ9bmJHcm91cHMqX2dyb3VwSXRlbUhlaWdodDtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCpkYXRhLmxlbmd0aCt0bXBSZXNIZWlnaHR9ZWxzZXtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCooZGF0YS5sZW5ndGgrbmJHcm91cHMpfX1pZihyZXNIZWlnaHQ8bXMuY29tYm9ib3guaGVpZ2h0KCl8fHJlc0hlaWdodDw9Y2ZnLm1heERyb3BIZWlnaHQpe21zLmNvbWJvYm94LmhlaWdodChyZXNIZWlnaHQpfWVsc2UgaWYocmVzSGVpZ2h0Pj1tcy5jb21ib2JveC5oZWlnaHQoKSYmcmVzSGVpZ2h0PmNmZy5tYXhEcm9wSGVpZ2h0KXttcy5jb21ib2JveC5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpfWlmKGRhdGEubGVuZ3RoPT09MSYmY2ZnLmF1dG9TZWxlY3Q9PT10cnVlKXttcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcihcIjpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGNmZy5zZWxlY3RGaXJzdD09PXRydWUpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKFwiOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGRhdGEubGVuZ3RoPT09MCYmbXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCIpe3ZhciBub1N1Z2dlc3Rpb25UZXh0PWNmZy5ub1N1Z2dlc3Rpb25UZXh0LnJlcGxhY2UoL1xce1xcey4qXFx9XFx9Lyxtcy5pbnB1dC52YWwoKSk7c2VsZi5fdXBkYXRlSGVscGVyKG5vU3VnZ2VzdGlvblRleHQpO21zLmNvbGxhcHNlKCl9aWYoY2ZnLmFsbG93RnJlZUVudHJpZXM9PT1mYWxzZSl7aWYoZGF0YS5sZW5ndGg9PT0wKXskKG1zLmlucHV0KS5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7bXMuY29tYm9ib3guaGlkZSgpfWVsc2V7JChtcy5pbnB1dCkucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpfX19LF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OmZ1bmN0aW9uKGRhdGEpe3ZhciBqc29uPVtdOyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LHMpe3ZhciBlbnRyeT17fTtlbnRyeVtjZmcuZGlzcGxheUZpZWxkXT1lbnRyeVtjZmcudmFsdWVGaWVsZF09JC50cmltKHMpO2pzb24ucHVzaChlbnRyeSl9KTtyZXR1cm4ganNvbn0sX2hpZ2hsaWdodFN1Z2dlc3Rpb246ZnVuY3Rpb24oaHRtbCl7dmFyIHE9bXMuaW5wdXQudmFsKCk7dmFyIHNwZWNpYWxDaGFyYWN0ZXJzPVtcIl5cIixcIiRcIixcIipcIixcIitcIixcIj9cIixcIi5cIixcIihcIixcIilcIixcIjpcIixcIiFcIixcInxcIixcIntcIixcIn1cIixcIltcIixcIl1cIl07JC5lYWNoKHNwZWNpYWxDaGFyYWN0ZXJzLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXtxPXEucmVwbGFjZSh2YWx1ZSxcIlxcXFxcIit2YWx1ZSl9KTtpZihxLmxlbmd0aD09PTApe3JldHVybiBodG1sfXZhciBnbG9iPWNmZy5tYXRjaENhc2U9PT10cnVlP1wiZ1wiOlwiZ2lcIjtyZXR1cm4gaHRtbC5yZXBsYWNlKG5ldyBSZWdFeHAoXCIoXCIrcStcIikoPyEoW148XSspPz4pXCIsZ2xvYiksXCI8ZW0+JDE8L2VtPlwiKX0sX21vdmVTZWxlY3RlZFJvdzpmdW5jdGlvbihkaXIpe2lmKCFjZmcuZXhwYW5kZWQpe21zLmV4cGFuZCgpfXZhciBsaXN0LHN0YXJ0LGFjdGl2ZSxzY3JvbGxQb3M7bGlzdD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpO2lmKGRpcj09PVwiZG93blwiKXtzdGFydD1saXN0LmVxKDApfWVsc2V7c3RhcnQ9bGlzdC5maWx0ZXIoXCI6bGFzdFwiKX1hY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIik7aWYoYWN0aXZlLmxlbmd0aD4wKXtpZihkaXI9PT1cImRvd25cIil7c3RhcnQ9YWN0aXZlLm5leHRBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmVxKDApfXNjcm9sbFBvcz1tcy5jb21ib2JveC5zY3JvbGxUb3AoKTttcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7aWYoc3RhcnRbMF0ub2Zmc2V0VG9wK3N0YXJ0Lm91dGVySGVpZ2h0KCk+bXMuY29tYm9ib3guaGVpZ2h0KCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChzY3JvbGxQb3MrX2NvbWJvSXRlbUhlaWdodCl9fWVsc2V7c3RhcnQ9YWN0aXZlLnByZXZBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmZpbHRlcihcIjpsYXN0XCIpO21zLmNvbWJvYm94LnNjcm9sbFRvcChfY29tYm9JdGVtSGVpZ2h0Kmxpc3QubGVuZ3RoKX1pZihzdGFydFswXS5vZmZzZXRUb3A8bXMuY29tYm9ib3guc2Nyb2xsVG9wKCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChtcy5jb21ib2JveC5zY3JvbGxUb3AoKS1fY29tYm9JdGVtSGVpZ2h0KX19fWxpc3QucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7c3RhcnQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9LF9wcm9jZXNzU3VnZ2VzdGlvbnM6ZnVuY3Rpb24oc291cmNlKXt2YXIganNvbj1udWxsLGRhdGE9c291cmNlfHxjZmcuZGF0YTtpZihkYXRhIT09bnVsbCl7aWYodHlwZW9mIGRhdGE9PT1cImZ1bmN0aW9uXCIpe2RhdGE9ZGF0YS5jYWxsKG1zLG1zLmdldFJhd1ZhbHVlKCkpfWlmKHR5cGVvZiBkYXRhPT09XCJzdHJpbmdcIil7JChtcykudHJpZ2dlcihcImJlZm9yZWxvYWRcIixbbXNdKTt2YXIgcXVlcnlQYXJhbXM9e307cXVlcnlQYXJhbXNbY2ZnLnF1ZXJ5UGFyYW1dPW1zLmlucHV0LnZhbCgpO3ZhciBwYXJhbXM9JC5leHRlbmQocXVlcnlQYXJhbXMsY2ZnLmRhdGFVcmxQYXJhbXMpOyQuYWpheCgkLmV4dGVuZCh7dHlwZTpjZmcubWV0aG9kLHVybDpkYXRhLGRhdGE6cGFyYW1zLGJlZm9yZVNlbmQ6Y2ZnLmJlZm9yZVNlbmQsc3VjY2VzczpmdW5jdGlvbihhc3luY0RhdGEpe2pzb249dHlwZW9mIGFzeW5jRGF0YT09PVwic3RyaW5nXCI/SlNPTi5wYXJzZShhc3luY0RhdGEpOmFzeW5jRGF0YTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoanNvbik7JChtcykudHJpZ2dlcihcImxvYWRcIixbbXMsanNvbl0pO2lmKHNlbGYuX2FzeW5jVmFsdWVzKXttcy5zZXRWYWx1ZSh0eXBlb2Ygc2VsZi5fYXN5bmNWYWx1ZXM9PT1cInN0cmluZ1wiP0pTT04ucGFyc2Uoc2VsZi5fYXN5bmNWYWx1ZXMpOnNlbGYuX2FzeW5jVmFsdWVzKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtkZWxldGUgc2VsZi5fYXN5bmNWYWx1ZXN9fSxlcnJvcjpmdW5jdGlvbigpe3Rocm93XCJDb3VsZCBub3QgcmVhY2ggc2VydmVyXCJ9fSxjZmcuYWpheENvbmZpZykpO3JldHVybn1lbHNle2lmKGRhdGEubGVuZ3RoPjAmJnR5cGVvZiBkYXRhWzBdPT09XCJzdHJpbmdcIil7X2NiRGF0YT1zZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpfWVsc2V7X2NiRGF0YT1kYXRhW2NmZy5yZXN1bHRzRmllbGRdfHxkYXRhfX12YXIgc29ydGVkRGF0YT1jZmcubW9kZT09PVwicmVtb3RlXCI/X2NiRGF0YTpzZWxmLl9zb3J0QW5kVHJpbShfY2JEYXRhKTtzZWxmLl9kaXNwbGF5U3VnZ2VzdGlvbnMoc2VsZi5fZ3JvdXAoc29ydGVkRGF0YSkpfX0sX3JlbmRlcjpmdW5jdGlvbihlbCl7bXMuc2V0TmFtZShjZmcubmFtZSk7bXMuY29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtY3RuIGZvcm0tY29udHJvbCBcIisoY2ZnLnJlc3VsdEFzU3RyaW5nP1wibXMtYXMtc3RyaW5nIFwiOlwiXCIpK2NmZy5jbHMrKCQoZWwpLmhhc0NsYXNzKFwiaW5wdXQtbGdcIik/XCIgaW5wdXQtbGdcIjpcIlwiKSsoJChlbCkuaGFzQ2xhc3MoXCJpbnB1dC1zbVwiKT9cIiBpbnB1dC1zbVwiOlwiXCIpKyhjZmcuZGlzYWJsZWQ9PT10cnVlP1wiIG1zLWN0bi1kaXNhYmxlZFwiOlwiXCIpKyhjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtY3RuLXJlYWRvbmx5XCIpKyhjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZT9cIlwiOlwiIG1zLW5vLXRyaWdnZXJcIiksc3R5bGU6Y2ZnLnN0eWxlLGlkOmNmZy5pZH0pO21zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLHRoaXMpKTttcy5jb250YWluZXIuYmx1cigkLnByb3h5KGhhbmRsZXJzLl9vbkJsdXIsdGhpcykpO21zLmNvbnRhaW5lci5rZXlkb3duKCQucHJveHkoaGFuZGxlcnMuX29uS2V5RG93bix0aGlzKSk7bXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsdGhpcykpO21zLmlucHV0PSQoXCI8aW5wdXQvPlwiLCQuZXh0ZW5kKHt0eXBlOlwidGV4dFwiLFwiY2xhc3NcIjpjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtaW5wdXQtcmVhZG9ubHlcIixyZWFkb25seTohY2ZnLmVkaXRhYmxlLHBsYWNlaG9sZGVyOmNmZy5wbGFjZWhvbGRlcixkaXNhYmxlZDpjZmcuZGlzYWJsZWR9LGNmZy5pbnB1dENmZykpO21zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cyx0aGlzKSk7bXMuaW5wdXQuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25JbnB1dENsaWNrLHRoaXMpKTttcy5jb21ib2JveD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1jdG4gZHJvcGRvd24tbWVudVwifSkuaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTttcy5jb21ib2JveC5vbihcImNsaWNrXCIsXCJkaXYubXMtcmVzLWl0ZW1cIiwkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbVNlbGVjdGVkLHRoaXMpKTttcy5jb21ib2JveC5vbihcIm1vdXNlb3ZlclwiLFwiZGl2Lm1zLXJlcy1pdGVtXCIsJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1Nb3VzZU92ZXIsdGhpcykpO2lmKGNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLnNlbGVjdGlvbkNvbnRhaW5lcj1jZmcuc2VsZWN0aW9uQ29udGFpbmVyOyQobXMuc2VsZWN0aW9uQ29udGFpbmVyKS5hZGRDbGFzcyhcIm1zLXNlbC1jdG5cIil9ZWxzZXttcy5zZWxlY3Rpb25Db250YWluZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtY3RuXCJ9KX1tcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cyx0aGlzKSk7aWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiYhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCl9ZWxzZXttcy5jb250YWluZXIuYXBwZW5kKG1zLmlucHV0KX1tcy5oZWxwZXI9JChcIjxzcGFuLz5cIix7XCJjbGFzc1wiOlwibXMtaGVscGVyIFwiK2NmZy5pbmZvTXNnQ2xzfSk7c2VsZi5fdXBkYXRlSGVscGVyKCk7bXMuY29udGFpbmVyLmFwcGVuZChtcy5oZWxwZXIpOyQoZWwpLnJlcGxhY2VXaXRoKG1zLmNvbnRhaW5lcik7aWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe3N3aXRjaChjZmcuc2VsZWN0aW9uUG9zaXRpb24pe2Nhc2VcImJvdHRvbVwiOm1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25TdGFja2VkPT09dHJ1ZSl7bXMuc2VsZWN0aW9uQ29udGFpbmVyLndpZHRoKG1zLmNvbnRhaW5lci53aWR0aCgpKTttcy5zZWxlY3Rpb25Db250YWluZXIuYWRkQ2xhc3MoXCJtcy1zdGFja2VkXCIpfWJyZWFrO2Nhc2VcInJpZ2h0XCI6bXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7bXMuY29udGFpbmVyLmNzcyhcImZsb2F0XCIsXCJsZWZ0XCIpO2JyZWFrO2RlZmF1bHQ6bXMuY29udGFpbmVyLmFwcGVuZChtcy5zZWxlY3Rpb25Db250YWluZXIpO2JyZWFrfX1pZihjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZSl7bXMudHJpZ2dlcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXRyaWdnZXJcIixodG1sOic8ZGl2IGNsYXNzPVwibXMtdHJpZ2dlci1pY29cIj48L2Rpdj4nfSk7bXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljayx0aGlzKSk7bXMuY29udGFpbmVyLmFwcGVuZChtcy50cmlnZ2VyKX0kKHdpbmRvdykucmVzaXplKCQucHJveHkoaGFuZGxlcnMuX29uV2luZG93UmVzaXplZCx0aGlzKSk7aWYoY2ZnLnZhbHVlIT09bnVsbHx8Y2ZnLmRhdGEhPT1udWxsKXtpZih0eXBlb2YgY2ZnLmRhdGE9PT1cInN0cmluZ1wiKXtzZWxmLl9hc3luY1ZhbHVlcz1jZmcudmFsdWU7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihjZmcudmFsdWUhPT1udWxsKXttcy5zZXRWYWx1ZShjZmcudmFsdWUpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpfX19JChcImJvZHlcIikuY2xpY2soZnVuY3Rpb24oZSl7aWYobXMuY29udGFpbmVyLmhhc0NsYXNzKFwibXMtY3RuLWZvY3VzXCIpJiZtcy5jb250YWluZXIuaGFzKGUudGFyZ2V0KS5sZW5ndGg9PT0wJiZlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZihcIm1zLXJlcy1pdGVtXCIpPDAmJmUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKFwibXMtY2xvc2UtYnRuXCIpPDAmJm1zLmNvbnRhaW5lclswXSE9PWUudGFyZ2V0KXtoYW5kbGVycy5fb25CbHVyKCl9fSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7Y2ZnLmV4cGFuZGVkPWZhbHNlO21zLmV4cGFuZCgpfX0sX3JlbmRlckNvbWJvSXRlbXM6ZnVuY3Rpb24oaXRlbXMsaXNHcm91cGVkKXt2YXIgcmVmPXRoaXMsaHRtbD1cIlwiOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIGRpc3BsYXllZD1jZmcucmVuZGVyZXIhPT1udWxsP2NmZy5yZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIGRpc2FibGVkPWNmZy5kaXNhYmxlZEZpZWxkIT09bnVsbCYmdmFsdWVbY2ZnLmRpc2FibGVkRmllbGRdPT09dHJ1ZTt2YXIgcmVzdWx0SXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWl0ZW0gXCIrKGlzR3JvdXBlZD9cIm1zLXJlcy1pdGVtLWdyb3VwZWQgXCI6XCJcIikrKGRpc2FibGVkP1wibXMtcmVzLWl0ZW0tZGlzYWJsZWQgXCI6XCJcIikrKGluZGV4JTI9PT0xJiZjZmcudXNlWmVicmFTdHlsZT09PXRydWU/XCJtcy1yZXMtb2RkXCI6XCJcIiksaHRtbDpjZmcuaGlnaGxpZ2h0PT09dHJ1ZT9zZWxmLl9oaWdobGlnaHRTdWdnZXN0aW9uKGRpc3BsYXllZCk6ZGlzcGxheWVkLFwiZGF0YS1qc29uXCI6SlNPTi5zdHJpbmdpZnkodmFsdWUpfSk7aHRtbCs9JChcIjxkaXYvPlwiKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCl9KTttcy5jb21ib2JveC5hcHBlbmQoaHRtbCk7X2NvbWJvSXRlbUhlaWdodD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOmZpcnN0XCIpLm91dGVySGVpZ2h0KCl9LF9yZW5kZXJTZWxlY3Rpb246ZnVuY3Rpb24oKXt2YXIgcmVmPXRoaXMsdz0wLGlucHV0T2Zmc2V0PTAsaXRlbXM9W10sYXNUZXh0PWNmZy5yZXN1bHRBc1N0cmluZz09PXRydWUmJiFfaGFzRm9jdXM7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmZpbmQoXCIubXMtc2VsLWl0ZW1cIikucmVtb3ZlKCk7aWYobXMuX3ZhbHVlQ29udGFpbmVyIT09dW5kZWZpbmVkKXttcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCl9JC5lYWNoKF9zZWxlY3Rpb24sZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBzZWxlY3RlZEl0ZW1FbCxkZWxJdGVtRWwsc2VsZWN0ZWRJdGVtSHRtbD1jZmcuc2VsZWN0aW9uUmVuZGVyZXIhPT1udWxsP2NmZy5zZWxlY3Rpb25SZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIHZhbGlkQ2xzPXNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbSh2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXSk/XCJcIjpcIiBtcy1zZWwtaW52YWxpZFwiO2lmKGFzVGV4dD09PXRydWUpe3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gbXMtc2VsLXRleHQgXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWwrKGluZGV4PT09X3NlbGVjdGlvbi5sZW5ndGgtMT9cIlwiOmNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcil9KS5kYXRhKFwianNvblwiLHZhbHVlKX1lbHNle3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWx9KS5kYXRhKFwianNvblwiLHZhbHVlKTtpZihjZmcuZGlzYWJsZWQ9PT1mYWxzZSl7ZGVsSXRlbUVsPSQoXCI8c3Bhbi8+XCIse1wiY2xhc3NcIjpcIm1zLWNsb3NlLWJ0blwifSkuZGF0YShcImpzb25cIix2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO2RlbEl0ZW1FbC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRhZ1RyaWdnZXJDbGljayxyZWYpKX19aXRlbXMucHVzaChzZWxlY3RlZEl0ZW1FbCl9KTttcy5zZWxlY3Rpb25Db250YWluZXIucHJlcGVuZChpdGVtcyk7bXMuX3ZhbHVlQ29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7c3R5bGU6XCJkaXNwbGF5OiBub25lO1wifSk7JC5lYWNoKG1zLmdldFZhbHVlKCksZnVuY3Rpb24oaSx2YWwpe3ZhciBlbD0kKFwiPGlucHV0Lz5cIix7dHlwZTpcImhpZGRlblwiLG5hbWU6Y2ZnLm5hbWUsdmFsdWU6dmFsfSk7ZWwuYXBwZW5kVG8obXMuX3ZhbHVlQ29udGFpbmVyKX0pO21zLl92YWx1ZUNvbnRhaW5lci5hcHBlbmRUbyhtcy5zZWxlY3Rpb25Db250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLmlucHV0LndpZHRoKDApO2lucHV0T2Zmc2V0PW1zLmlucHV0Lm9mZnNldCgpLmxlZnQtbXMuc2VsZWN0aW9uQ29udGFpbmVyLm9mZnNldCgpLmxlZnQ7dz1tcy5jb250YWluZXIud2lkdGgoKS1pbnB1dE9mZnNldC00Mjttcy5pbnB1dC53aWR0aCh3KX1pZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXttcy5oZWxwZXIuaGlkZSgpfX0sX3NlbGVjdEl0ZW06ZnVuY3Rpb24oaXRlbSl7aWYoY2ZnLm1heFNlbGVjdGlvbj09PTEpe19zZWxlY3Rpb249W119bXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKFwianNvblwiKSk7aXRlbS5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtpZihjZmcuZXhwYW5kT25Gb2N1cz09PWZhbHNlfHxfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe21zLmNvbGxhcHNlKCl9aWYoIV9oYXNGb2N1cyl7bXMuaW5wdXQuZm9jdXMoKX1lbHNlIGlmKF9oYXNGb2N1cyYmKGNmZy5leHBhbmRPbkZvY3VzfHxfY3RybERvd24pKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihfY3RybERvd24pe21zLmV4cGFuZCgpfX19LF9zb3J0QW5kVHJpbTpmdW5jdGlvbihkYXRhKXt2YXIgcT1tcy5nZXRSYXdWYWx1ZSgpLGZpbHRlcmVkPVtdLG5ld1N1Z2dlc3Rpb25zPVtdLHNlbGVjdGVkVmFsdWVzPW1zLmdldFZhbHVlKCk7aWYocS5sZW5ndGg+MCl7JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgsb2JqKXt2YXIgbmFtZT1vYmpbY2ZnLmRpc3BsYXlGaWVsZF07aWYoY2ZnLm1hdGNoQ2FzZT09PXRydWUmJm5hbWUuaW5kZXhPZihxKT4tMXx8Y2ZnLm1hdGNoQ2FzZT09PWZhbHNlJiZuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPi0xKXtpZihjZmcuc3RyaWN0U3VnZ2VzdD09PWZhbHNlfHxuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPT09MCl7ZmlsdGVyZWQucHVzaChvYmopfX19KX1lbHNle2ZpbHRlcmVkPWRhdGF9JC5lYWNoKGZpbHRlcmVkLGZ1bmN0aW9uKGluZGV4LG9iail7aWYoY2ZnLmFsbG93RHVwbGljYXRlc3x8JC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sc2VsZWN0ZWRWYWx1ZXMpPT09LTEpe25ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKX19KTtpZihjZmcuc29ydE9yZGVyIT09bnVsbCl7bmV3U3VnZ2VzdGlvbnMuc29ydChmdW5jdGlvbihhLGIpe2lmKGFbY2ZnLnNvcnRPcmRlcl08YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8tMToxfWlmKGFbY2ZnLnNvcnRPcmRlcl0+YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8xOi0xfXJldHVybiAwfSl9aWYoY2ZnLm1heFN1Z2dlc3Rpb25zJiZjZmcubWF4U3VnZ2VzdGlvbnM+MCl7bmV3U3VnZ2VzdGlvbnM9bmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCxjZmcubWF4U3VnZ2VzdGlvbnMpfXJldHVybiBuZXdTdWdnZXN0aW9uc30sX2dyb3VwOmZ1bmN0aW9uKGRhdGEpe2lmKGNmZy5ncm91cEJ5IT09bnVsbCl7X2dyb3Vwcz17fTskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIHByb3BzPWNmZy5ncm91cEJ5LmluZGV4T2YoXCIuXCIpPi0xP2NmZy5ncm91cEJ5LnNwbGl0KFwiLlwiKTpjZmcuZ3JvdXBCeTt2YXIgcHJvcD12YWx1ZVtjZmcuZ3JvdXBCeV07aWYodHlwZW9mIHByb3BzIT1cInN0cmluZ1wiKXtwcm9wPXZhbHVlO3doaWxlKHByb3BzLmxlbmd0aD4wKXtwcm9wPXByb3BbcHJvcHMuc2hpZnQoKV19fWlmKF9ncm91cHNbcHJvcF09PT11bmRlZmluZWQpe19ncm91cHNbcHJvcF09e3RpdGxlOnByb3AsaXRlbXM6W3ZhbHVlXX19ZWxzZXtfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpfX0pfXJldHVybiBkYXRhfSxfdXBkYXRlSGVscGVyOmZ1bmN0aW9uKGh0bWwpe21zLmhlbHBlci5odG1sKGh0bWwpO2lmKCFtcy5oZWxwZXIuaXMoXCI6dmlzaWJsZVwiKSl7bXMuaGVscGVyLmZhZGVJbigpfX0sX3ZhbGlkYXRlU2luZ2xlSXRlbTpmdW5jdGlvbih2YWx1ZSl7aWYoY2ZnLnZyZWdleCE9PW51bGwmJmNmZy52cmVnZXggaW5zdGFuY2VvZiBSZWdFeHApe3JldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpfWVsc2UgaWYoY2ZnLnZ0eXBlIT09bnVsbCl7c3dpdGNoKGNmZy52dHlwZSl7Y2FzZVwiYWxwaGFcIjpyZXR1cm4vXlthLXpBLVpfXSskLy50ZXN0KHZhbHVlKTtjYXNlXCJhbHBoYW51bVwiOnJldHVybi9eW2EtekEtWjAtOV9dKyQvLnRlc3QodmFsdWUpO2Nhc2VcImVtYWlsXCI6cmV0dXJuL14oXFx3KykoW1xcLSsuXVtcXHddKykqQChcXHdbXFwtXFx3XSpcXC4pezEsNX0oW0EtWmEtel0pezIsNn0kLy50ZXN0KHZhbHVlKTtjYXNlXCJ1cmxcIjpyZXR1cm4vKCgoXmh0dHBzPyl8KF5mdHApKTpcXC9cXC8oW1xcLVxcd10rXFwuKStcXHd7MiwzfShcXC9bJVxcLVxcd10rKFxcLlxcd3syLH0pPykqKChbXFx3XFwtXFwuXFw/XFxcXFxcLytAJiM7YH49JSFdKikoXFwuXFx3ezIsfSk/KSpcXC8/KS9pLnRlc3QodmFsdWUpO2Nhc2VcImlwYWRkcmVzc1wiOnJldHVybi9eXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30kLy50ZXN0KHZhbHVlKX19cmV0dXJuIHRydWV9fTt2YXIgaGFuZGxlcnM9e19vbkJsdXI6ZnVuY3Rpb24oKXttcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29sbGFwc2UoKTtfaGFzRm9jdXM9ZmFsc2U7aWYobXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCImJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09dHJ1ZSl7dmFyIG9iaj17fTtvYmpbY2ZnLmRpc3BsYXlGaWVsZF09b2JqW2NmZy52YWx1ZUZpZWxkXT1tcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTttcy5hZGRUb1NlbGVjdGlvbihvYmopfXNlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKG1zLmlzVmFsaWQoKT09PWZhbHNlKXttcy5jb250YWluZXIuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpfWVsc2UgaWYobXMuaW5wdXQudmFsKCkhPT1cIlwiJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PWZhbHNlKXttcy5lbXB0eSgpO3NlbGYuX3VwZGF0ZUhlbHBlcihcIlwiKX0kKG1zKS50cmlnZ2VyKFwiYmx1clwiLFttc10pfSxfb25Db21ib0l0ZW1Nb3VzZU92ZXI6ZnVuY3Rpb24oZSl7dmFyIHRhcmdldD0kKGUuY3VycmVudFRhcmdldCk7aWYoIXRhcmdldC5oYXNDbGFzcyhcIm1zLXJlcy1pdGVtLWRpc2FibGVkXCIpKXttcy5jb21ib2JveC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO3RhcmdldC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX19LF9vbkNvbWJvSXRlbVNlbGVjdGVkOmZ1bmN0aW9uKGUpe3ZhciB0YXJnZXQ9JChlLmN1cnJlbnRUYXJnZXQpO2lmKCF0YXJnZXQuaGFzQ2xhc3MoXCJtcy1yZXMtaXRlbS1kaXNhYmxlZFwiKSl7c2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpfX0sX29uRm9jdXM6ZnVuY3Rpb24oKXttcy5pbnB1dC5mb2N1cygpfSxfb25JbnB1dENsaWNrOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJl9oYXNGb2N1cyl7aWYoY2ZnLnRvZ2dsZU9uQ2xpY2s9PT10cnVlKXtpZihjZmcuZXhwYW5kZWQpe21zLmNvbGxhcHNlKCl9ZWxzZXttcy5leHBhbmQoKX19fX0sX29uSW5wdXRGb2N1czpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiYhX2hhc0ZvY3VzKXtfaGFzRm9jdXM9dHJ1ZTttcy5jb250YWluZXIuYWRkQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTt2YXIgY3VyTGVuZ3RoPW1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO2lmKGNmZy5leHBhbmRPbkZvY3VzPT09dHJ1ZSl7bXMuZXhwYW5kKCl9aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2UgaWYoY3VyTGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtY3VyTGVuZ3RoKSl9c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcImZvY3VzXCIsW21zXSl9fSxfb25LZXlEb3duOmZ1bmN0aW9uKGUpe3ZhciBhY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIiksZnJlZUlucHV0PW1zLmlucHV0LnZhbCgpOyQobXMpLnRyaWdnZXIoXCJrZXlkb3duXCIsW21zLGVdKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5UQUImJihjZmcudXNlVGFiS2V5PT09ZmFsc2V8fGNmZy51c2VUYWJLZXk9PT10cnVlJiZhY3RpdmUubGVuZ3RoPT09MCYmbXMuaW5wdXQudmFsKCkubGVuZ3RoPT09MCkpe2hhbmRsZXJzLl9vbkJsdXIoKTtyZXR1cm59c3dpdGNoKGUua2V5Q29kZSl7Y2FzZSBLRVlDT0RFUy5CQUNLU1BBQ0U6aWYoZnJlZUlucHV0Lmxlbmd0aD09PTAmJm1zLmdldFNlbGVjdGlvbigpLmxlbmd0aD4wJiZjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCIpe19zZWxlY3Rpb24ucG9wKCk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFttcyxtcy5nZXRTZWxlY3Rpb24oKV0pO21zLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmbXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcik7bXMuaW5wdXQuZm9jdXMoKTtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5FU0M6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6aWYoZnJlZUlucHV0IT09XCJcInx8Y2ZnLmV4cGFuZGVkKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DT01NQTppZihjZmcudXNlQ29tbWFLZXk9PT10cnVlKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DVFJMOl9jdHJsRG93bj10cnVlO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOmUucHJldmVudERlZmF1bHQoKTtzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJkb3duXCIpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuVVBBUlJPVzplLnByZXZlbnREZWZhdWx0KCk7c2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7YnJlYWs7ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe2UucHJldmVudERlZmF1bHQoKX1icmVha319LF9vbktleVVwOmZ1bmN0aW9uKGUpe3ZhciBmcmVlSW5wdXQ9bXMuZ2V0UmF3VmFsdWUoKSxpbnB1dFZhbGlkPSQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoPjAmJighY2ZnLm1heEVudHJ5TGVuZ3RofHwkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aDw9Y2ZnLm1heEVudHJ5TGVuZ3RoKSxzZWxlY3RlZCxvYmo9e307JChtcykudHJpZ2dlcihcImtleXVwXCIsW21zLGVdKTtjbGVhclRpbWVvdXQoX3RpbWVyKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5FU0MmJmNmZy5leHBhbmRlZCl7bXMuY29tYm9ib3guaGlkZSgpfWlmKGUua2V5Q29kZT09PUtFWUNPREVTLlRBQiYmY2ZnLnVzZVRhYktleT09PWZhbHNlfHxlLmtleUNvZGU+S0VZQ09ERVMuRU5URVImJmUua2V5Q29kZTxLRVlDT0RFUy5TUEFDRSl7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuQ1RSTCl7X2N0cmxEb3duPWZhbHNlfXJldHVybn1zd2l0Y2goZS5rZXlDb2RlKXtjYXNlIEtFWUNPREVTLlVQQVJST1c6Y2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5DT01NQTppZihlLmtleUNvZGUhPT1LRVlDT0RFUy5DT01NQXx8Y2ZnLnVzZUNvbW1hS2V5PT09dHJ1ZSl7ZS5wcmV2ZW50RGVmYXVsdCgpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3NlbGVjdGVkPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpO2lmKHNlbGVjdGVkLmxlbmd0aD4wKXtzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtyZXR1cm59fWlmKGlucHV0VmFsaWQ9PT10cnVlJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PXRydWUpe29ialtjZmcuZGlzcGxheUZpZWxkXT1vYmpbY2ZnLnZhbHVlRmllbGRdPWZyZWVJbnB1dC50cmltKCk7bXMuYWRkVG9TZWxlY3Rpb24ob2JqKTttcy5jb2xsYXBzZSgpO21zLmlucHV0LmZvY3VzKCl9YnJlYWt9ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXtpZihmcmVlSW5wdXQubGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtZnJlZUlucHV0Lmxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2UgaWYoY2ZnLm1heEVudHJ5TGVuZ3RoJiZmcmVlSW5wdXQubGVuZ3RoPmNmZy5tYXhFbnRyeUxlbmd0aCl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhFbnRyeVJlbmRlcmVyLmNhbGwodGhpcyxmcmVlSW5wdXQubGVuZ3RoLWNmZy5tYXhFbnRyeUxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2V7bXMuaGVscGVyLmhpZGUoKTtpZihjZmcubWluQ2hhcnM8PWZyZWVJbnB1dC5sZW5ndGgpe190aW1lcj1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXttcy5leHBhbmQoKX19LGNmZy50eXBlRGVsYXkpfX19YnJlYWt9fSxfb25UYWdUcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oZSl7bXMucmVtb3ZlRnJvbVNlbGVjdGlvbigkKGUuY3VycmVudFRhcmdldCkuZGF0YShcImpzb25cIikpfSxfb25UcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmIShjZmcuZXhwYW5kT25Gb2N1cz09PXRydWUmJl9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbikpeyQobXMpLnRyaWdnZXIoXCJ0cmlnZ2VyY2xpY2tcIixbbXNdKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfWVsc2V7dmFyIGN1ckxlbmd0aD1tcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtpZihjdXJMZW5ndGg+PWNmZy5taW5DaGFycyl7bXMuaW5wdXQuZm9jdXMoKTttcy5leHBhbmQoKX1lbHNle3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWN1ckxlbmd0aCkpfX19fSxfb25XaW5kb3dSZXNpemVkOmZ1bmN0aW9uKCl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCl9fTtpZihlbGVtZW50IT09bnVsbCl7c2VsZi5fcmVuZGVyKGVsZW1lbnQpfX07JC5mbi5tYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24ob3B0aW9ucyl7dmFyIG9iaj0kKHRoaXMpO2lmKG9iai5zaXplKCk9PT0xJiZvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKSl7cmV0dXJuIG9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpfW9iai5lYWNoKGZ1bmN0aW9uKGkpe3ZhciBjbnRyPSQodGhpcyk7aWYoY250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIpKXtyZXR1cm59aWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJzZWxlY3RcIil7b3B0aW9ucy5kYXRhPVtdO29wdGlvbnMudmFsdWU9W107JC5lYWNoKHRoaXMuY2hpbGRyZW4sZnVuY3Rpb24oaW5kZXgsY2hpbGQpe2lmKGNoaWxkLm5vZGVOYW1lJiZjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJvcHRpb25cIil7b3B0aW9ucy5kYXRhLnB1c2goe2lkOmNoaWxkLnZhbHVlLG5hbWU6Y2hpbGQudGV4dH0pO2lmKCQoY2hpbGQpLmF0dHIoXCJzZWxlY3RlZFwiKSl7b3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKX19fSl9dmFyIGRlZj17fTskLmVhY2godGhpcy5hdHRyaWJ1dGVzLGZ1bmN0aW9uKGksYXR0KXtkZWZbYXR0Lm5hbWVdPWF0dC5uYW1lPT09XCJ2YWx1ZVwiJiZhdHQudmFsdWUhPT1cIlwiP0pTT04ucGFyc2UoYXR0LnZhbHVlKTphdHQudmFsdWV9KTt2YXIgZmllbGQ9bmV3IE1hZ2ljU3VnZ2VzdCh0aGlzLCQuZXh0ZW5kKFtdLCQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLG9wdGlvbnMsZGVmKSk7Y250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpO2ZpZWxkLmNvbnRhaW5lci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpfSk7aWYob2JqLnNpemUoKT09PTEpe3JldHVybiBvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKX1yZXR1cm4gb2JqfTskLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cz17fX0pKGpRdWVyeSk7IiwiLyoqXHJcbiAqIE11bHRpcGxlIFNlbGVjdGlvbiBDb21wb25lbnQgZm9yIEJvb3RzdHJhcFxyXG4gKiBDaGVjayBuaWNvbGFzYml6ZS5naXRodWIuaW8vbWFnaWNzdWdnZXN0LyBmb3IgbGF0ZXN0IHVwZGF0ZXMuXHJcbiAqXHJcbiAqIEF1dGhvcjogICAgICAgTmljb2xhcyBCaXplXHJcbiAqIENyZWF0ZWQ6ICAgICAgRmViIDh0aCAyMDEzXHJcbiAqIExhc3QgVXBkYXRlZDogT2N0IDE2dGggMjAxNFxyXG4gKiBWZXJzaW9uOiAgICAgIDIuMS40XHJcbiAqIExpY2VuY2U6ICAgICAgTWFnaWNTdWdnZXN0IGlzIGxpY2VuY2VkIHVuZGVyIE1JVCBsaWNlbmNlIChodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUKVxyXG4gKi9cclxuKGZ1bmN0aW9uKCQpXHJcbntcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgdmFyIE1hZ2ljU3VnZ2VzdCA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIG1zID0gdGhpcztcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2ljU3VnZ2VzdCBjb21wb25lbnRcclxuICAgICAgICAgKi9cclxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICAgICAgICAgIC8qKioqKioqKioqICBDT05GSUdVUkFUSU9OIFBST1BFUlRJRVMgKioqKioqKioqKioqL1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogUmVzdHJpY3RzIG9yIGFsbG93cyB0aGUgdXNlciB0byB2YWxpZGF0ZSB0eXBlZCBlbnRyaWVzLlxyXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byB0cnVlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgYWxsb3dGcmVlRW50cmllczogdHJ1ZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZXN0cmljdHMgb3IgYWxsb3dzIHRoZSB1c2VyIHRvIGFkZCB0aGUgc2FtZSBlbnRyeSBtb3JlIHRoYW4gb25jZVxyXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byBmYWxzZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGFsbG93RHVwbGljYXRlczogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBjb25maWcgb2JqZWN0IHBhc3NlZCB0byBlYWNoICQuYWpheCBjYWxsXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBhamF4Q29uZmlnOiB7fSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBJZiBhIHNpbmdsZSBzdWdnZXN0aW9uIGNvbWVzIG91dCwgaXQgaXMgcHJlc2VsZWN0ZWQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBhdXRvU2VsZWN0OiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEF1dG8gc2VsZWN0IHRoZSBmaXJzdCBtYXRjaGluZyBpdGVtIHdpdGggbXVsdGlwbGUgaXRlbXMgc2hvd25cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNlbGVjdEZpcnN0OiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBbGxvdyBjdXN0b21pemF0aW9uIG9mIHF1ZXJ5IHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcXVlcnlQYXJhbTogJ3F1ZXJ5JyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRyaWdnZXJlZCBqdXN0IGJlZm9yZSB0aGUgYWpheCByZXF1ZXN0IGlzIHNlbnQsIHNpbWlsYXIgdG8galF1ZXJ5XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbigpeyB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIENTUyBjbGFzcyB0byBhcHBseSB0byB0aGUgZmllbGQncyB1bmRlcmx5aW5nIGVsZW1lbnQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBjbHM6ICcnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEpTT04gRGF0YSBzb3VyY2UgdXNlZCB0byBwb3B1bGF0ZSB0aGUgY29tYm8gYm94LiAzIG9wdGlvbnMgYXJlIGF2YWlsYWJsZSBoZXJlOlxyXG4gICAgICAgICAgICAgKiBObyBEYXRhIFNvdXJjZSAoZGVmYXVsdClcclxuICAgICAgICAgICAgICogICAgV2hlbiBsZWZ0IG51bGwsIHRoZSBjb21ibyBib3ggd2lsbCBub3Qgc3VnZ2VzdCBhbnl0aGluZy4gSXQgY2FuIHN0aWxsIGVuYWJsZSB0aGUgdXNlciB0byBlbnRlclxyXG4gICAgICAgICAgICAgKiAgICBtdWx0aXBsZSBlbnRyaWVzIGlmIGFsbG93RnJlZUVudHJpZXMgaXMgKiBzZXQgdG8gdHJ1ZSAoZGVmYXVsdCkuXHJcbiAgICAgICAgICAgICAqIFN0YXRpYyBTb3VyY2VcclxuICAgICAgICAgICAgICogICAgWW91IGNhbiBwYXNzIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cywgYW4gYXJyYXkgb2Ygc3RyaW5ncyBvciBldmVuIGEgc2luZ2xlIENTViBzdHJpbmcgYXMgdGhlXHJcbiAgICAgICAgICAgICAqICAgIGRhdGEgc291cmNlLkZvciBleC4gZGF0YTogWyoge2lkOjAsbmFtZTpcIlBhcmlzXCJ9LCB7aWQ6IDEsIG5hbWU6IFwiTmV3IFlvcmtcIn1dXHJcbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gYWxzbyBwYXNzIGFueSBqc29uIG9iamVjdCB3aXRoIHRoZSByZXN1bHRzIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGpzb24gYXJyYXkuXHJcbiAgICAgICAgICAgICAqIFVybFxyXG4gICAgICAgICAgICAgKiAgICAgWW91IGNhbiBwYXNzIHRoZSB1cmwgZnJvbSB3aGljaCB0aGUgY29tcG9uZW50IHdpbGwgZmV0Y2ggaXRzIEpTT04gZGF0YS5EYXRhIHdpbGwgYmUgZmV0Y2hlZFxyXG4gICAgICAgICAgICAgKiAgICAgdXNpbmcgYSBQT1NUIGFqYXggcmVxdWVzdCB0aGF0IHdpbGwgKiBpbmNsdWRlIHRoZSBlbnRlcmVkIHRleHQgYXMgJ3F1ZXJ5JyBwYXJhbWV0ZXIuIFRoZSByZXN1bHRzXHJcbiAgICAgICAgICAgICAqICAgICBmZXRjaGVkIGZyb20gdGhlIHNlcnZlciBjYW4gYmU6XHJcbiAgICAgICAgICAgICAqICAgICAtIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyAoZXg6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV0pXHJcbiAgICAgICAgICAgICAqICAgICAtIGEgc3RyaW5nIGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIHJlYWR5IHRvIGJlIHBhcnNlZCAoZXg6IFwiW3tpZDouLi4sbmFtZTouLi59LHsuLi59XVwiKVxyXG4gICAgICAgICAgICAgKiAgICAgLSBhIEpTT04gb2JqZWN0IHdob3NlIGRhdGEgd2lsbCBiZSBjb250YWluZWQgaW4gdGhlIHJlc3VsdHMgcHJvcGVydHlcclxuICAgICAgICAgICAgICogICAgICAoZXg6IHtyZXN1bHRzOiBbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dXHJcbiAgICAgICAgICAgICAqIEZ1bmN0aW9uXHJcbiAgICAgICAgICAgICAqICAgICBZb3UgY2FuIHBhc3MgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyAgKGV4OiBbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dKVxyXG4gICAgICAgICAgICAgKiAgICAgVGhlIGZ1bmN0aW9uIGNhbiByZXR1cm4gdGhlIEpTT04gZGF0YSBvciBpdCBjYW4gdXNlIHRoZSBmaXJzdCBhcmd1bWVudCBhcyBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIGRhdGEuXHJcbiAgICAgICAgICAgICAqICAgICBPbmx5IG9uZSAoY2FsbGJhY2sgZnVuY3Rpb24gb3IgcmV0dXJuIHZhbHVlKSBpcyBuZWVkZWQgZm9yIHRoZSBmdW5jdGlvbiB0byBzdWNjZWVkLlxyXG4gICAgICAgICAgICAgKiAgICAgU2VlIHRoZSBmb2xsb3dpbmcgZXhhbXBsZTpcclxuICAgICAgICAgICAgICogICAgIGZ1bmN0aW9uIChyZXNwb25zZSkgeyB2YXIgbXlqc29uID0gW3tuYW1lOiAndGVzdCcsIGlkOiAxfV07IHJlc3BvbnNlKG15anNvbik7IHJldHVybiBteWpzb247IH1cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHRvIHRoZSBhamF4IGNhbGxcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGRhdGFVcmxQYXJhbXM6IHt9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFN0YXJ0IHRoZSBjb21wb25lbnQgaW4gYSBkaXNhYmxlZCBzdGF0ZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGRpc2FibGVkOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IHRoYXQgZGVmaW5lcyB0aGUgZGlzYWJsZWQgYmVoYXZpb3VyXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBkaXNhYmxlZEZpZWxkOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgZGlzcGxheWVkIGluIHRoZSBjb21ibyBsaXN0XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBkaXNwbGF5RmllbGQ6ICduYW1lJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZXQgdG8gZmFsc2UgaWYgeW91IG9ubHkgd2FudCBtb3VzZSBpbnRlcmFjdGlvbi4gSW4gdGhhdCBjYXNlIHRoZSBjb21ibyB3aWxsXHJcbiAgICAgICAgICAgICAqIGF1dG9tYXRpY2FsbHkgZXhwYW5kIG9uIGZvY3VzLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZWRpdGFibGU6IHRydWUsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2V0IHN0YXJ0aW5nIHN0YXRlIGZvciBjb21iby5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGV4cGFuZGVkOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBdXRvbWF0aWNhbGx5IGV4cGFuZHMgY29tYm8gb24gZm9jdXMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBleHBhbmRPbkZvY3VzOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBKU09OIHByb3BlcnR5IGJ5IHdoaWNoIHRoZSBsaXN0IHNob3VsZCBiZSBncm91cGVkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBncm91cEJ5OiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGhpZGUgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBoaWRlVHJpZ2dlcjogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gaGlnaGxpZ2h0IHNlYXJjaCBpbnB1dCB3aXRoaW4gZGlzcGxheWVkIHN1Z2dlc3Rpb25zXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBjdXN0b20gSUQgZm9yIHRoaXMgY29tcG9uZW50XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpZDogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGNsYXNzIHRoYXQgaXMgYWRkZWQgdG8gdGhlIGluZm8gbWVzc2FnZSBhcHBlYXJpbmcgb24gdGhlIHRvcC1yaWdodCBwYXJ0IG9mIHRoZSBjb21wb25lbnRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGluZm9Nc2dDbHM6ICcnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBwYXNzZWQgb3V0IHRvIHRoZSBJTlBVVCB0YWcuIEVuYWJsZXMgdXNhZ2Ugb2YgQW5ndWxhckpTJ3MgY3VzdG9tIHRhZ3MgZm9yIGV4LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaW5wdXRDZmc6IHt9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBjbGFzcyB0aGF0IGlzIGFwcGxpZWQgdG8gc2hvdyB0aGF0IHRoZSBmaWVsZCBpcyBpbnZhbGlkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpbnZhbGlkQ2xzOiAnbXMtaW52JyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBmaWx0ZXIgZGF0YSByZXN1bHRzIGFjY29yZGluZyB0byBjYXNlLiBVc2VsZXNzIGlmIHRoZSBkYXRhIGlzIGZldGNoZWQgcmVtb3RlbHlcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1hdGNoQ2FzZTogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogT25jZSBleHBhbmRlZCwgdGhlIGNvbWJvJ3MgaGVpZ2h0IHdpbGwgdGFrZSBhcyBtdWNoIHJvb20gYXMgdGhlICMgb2YgYXZhaWxhYmxlIHJlc3VsdHMuXHJcbiAgICAgICAgICAgICAqICAgIEluIGNhc2UgdGhlcmUgYXJlIHRvbyBtYW55IHJlc3VsdHMgZGlzcGxheWVkLCB0aGlzIHdpbGwgZml4IHRoZSBkcm9wIGRvd24gaGVpZ2h0LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWF4RHJvcEhlaWdodDogMjkwLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIERlZmluZXMgaG93IGxvbmcgdGhlIHVzZXIgZnJlZSBlbnRyeSBjYW4gYmUuIFNldCB0byBudWxsIGZvciBubyBsaW1pdC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1heEVudHJ5TGVuZ3RoOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIHRoZSBoZWxwZXIgdGV4dCB3aGVuIHRoZSBtYXggZW50cnkgbGVuZ3RoIGhhcyBiZWVuIHN1cnBhc3NlZC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1heEVudHJ5UmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnUGxlYXNlIHJlZHVjZSB5b3VyIGVudHJ5IGJ5ICcgKyB2ICsgJyBjaGFyYWN0ZXInICsgKHYgPiAxID8gJ3MnOicnKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgcmVzdWx0cyBkaXNwbGF5ZWQgaW4gdGhlIGNvbWJvIGRyb3AgZG93biBhdCBvbmNlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWF4U3VnZ2VzdGlvbnM6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIG1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRoZSB1c2VyIGNhbiBzZWxlY3QgaWYgbXVsdGlwbGUgc2VsZWN0aW9uIGlzIGFsbG93ZWQuXHJcbiAgICAgICAgICAgICAqICAgIFNldCB0byBudWxsIHRvIHJlbW92ZSB0aGUgbGltaXQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtYXhTZWxlY3Rpb246IDEwLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIHRoZSBoZWxwZXIgdGV4dCB3aGVuIHRoZSBtYXggc2VsZWN0aW9uIGFtb3VudCBoYXMgYmVlbiByZWFjaGVkLiBUaGUgZnVuY3Rpb24gaGFzIGEgc2luZ2xlXHJcbiAgICAgICAgICAgICAqICAgIHBhcmFtZXRlciB3aGljaCBpcyB0aGUgbnVtYmVyIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWF4U2VsZWN0aW9uUmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnWW91IGNhbm5vdCBjaG9vc2UgbW9yZSB0aGFuICcgKyB2ICsgJyBpdGVtJyArICh2ID4gMSA/ICdzJzonJyk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIG1ldGhvZCB1c2VkIGJ5IHRoZSBhamF4IHJlcXVlc3QuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgbWluaW11bSBudW1iZXIgb2YgY2hhcmFjdGVycyB0aGUgdXNlciBtdXN0IHR5cGUgYmVmb3JlIHRoZSBjb21ibyBleHBhbmRzIGFuZCBvZmZlcnMgc3VnZ2VzdGlvbnMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtaW5DaGFyczogMCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiBub3QgZW5vdWdoIGxldHRlcnMgYXJlIHNldC4gVGhlIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZVxyXG4gICAgICAgICAgICAgKiAgICBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgcmVxdWlyZWQgYW1vdW50IG9mIGxldHRlcnMgYW5kIHRoZSBjdXJyZW50IG9uZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1pbkNoYXJzUmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnUGxlYXNlIHR5cGUgJyArIHYgKyAnIG1vcmUgY2hhcmFjdGVyJyArICh2ID4gMSA/ICdzJzonJyk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogV2hldGhlciBvciBub3Qgc29ydGluZyAvIGZpbHRlcmluZyBzaG91bGQgYmUgZG9uZSByZW1vdGVseSBvciBsb2NhbGx5LlxyXG4gICAgICAgICAgICAgKiBVc2UgZWl0aGVyICdsb2NhbCcgb3IgJ3JlbW90ZSdcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1vZGU6ICdsb2NhbCcsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIG5hbWUgdXNlZCBhcyBhIGZvcm0gZWxlbWVudC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG5hbWU6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHRleHQgZGlzcGxheWVkIHdoZW4gdGhlcmUgYXJlIG5vIHN1Z2dlc3Rpb25zLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbm9TdWdnZXN0aW9uVGV4dDogJ05vIHN1Z2dlc3Rpb25zJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgZGVmYXVsdCBwbGFjZWhvbGRlciB0ZXh0IHdoZW4gbm90aGluZyBoYXMgYmVlbiBlbnRlcmVkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1R5cGUgb3IgY2xpY2sgaGVyZScsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB1c2VkIHRvIGRlZmluZSBob3cgdGhlIGl0ZW1zIHdpbGwgYmUgcHJlc2VudGVkIGluIHRoZSBjb21ib1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmVuZGVyZXI6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogV2hldGhlciBvciBub3QgdGhpcyBmaWVsZCBzaG91bGQgYmUgcmVxdWlyZWRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byByZW5kZXIgc2VsZWN0aW9uIGFzIGEgZGVsaW1pdGVkIHN0cmluZ1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmVzdWx0QXNTdHJpbmc6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRleHQgZGVsaW1pdGVyIHRvIHVzZSBpbiBhIGRlbGltaXRlZCBzdHJpbmcuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXN1bHRBc1N0cmluZ0RlbGltaXRlcjogJywnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCByZXByZXNlbnRzIHRoZSBsaXN0IG9mIHN1Z2dlc3RlZCBvYmplY3RzXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXN1bHRzRmllbGQ6ICdyZXN1bHRzJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBDU1MgY2xhc3MgdG8gYWRkIHRvIGEgc2VsZWN0ZWQgaXRlbVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc2VsZWN0aW9uQ2xzOiAnJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBbiBvcHRpb25hbCBlbGVtZW50IHJlcGxhY2VtZW50IGluIHdoaWNoIHRoZSBzZWxlY3Rpb24gaXMgcmVuZGVyZWRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNlbGVjdGlvbkNvbnRhaW5lcjogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBXaGVyZSB0aGUgc2VsZWN0ZWQgaXRlbXMgd2lsbCBiZSBkaXNwbGF5ZWQuIE9ubHkgJ3JpZ2h0JywgJ2JvdHRvbScgYW5kICdpbm5lcicgYXJlIHZhbGlkIHZhbHVlc1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc2VsZWN0aW9uUG9zaXRpb246ICdpbm5lcicsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB1c2VkIHRvIGRlZmluZSBob3cgdGhlIGl0ZW1zIHdpbGwgYmUgcHJlc2VudGVkIGluIHRoZSB0YWcgbGlzdFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc2VsZWN0aW9uUmVuZGVyZXI6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gc3RhY2sgdGhlIHNlbGVjdGlvbmVkIGl0ZW1zIHdoZW4gcG9zaXRpb25lZCBvbiB0aGUgYm90dG9tXHJcbiAgICAgICAgICAgICAqICAgIFJlcXVpcmVzIHRoZSBzZWxlY3Rpb25Qb3NpdGlvbiB0byBiZSBzZXQgdG8gJ2JvdHRvbSdcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHNlbGVjdGlvblN0YWNrZWQ6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIERpcmVjdGlvbiB1c2VkIGZvciBzb3J0aW5nLiBPbmx5ICdhc2MnIGFuZCAnZGVzYycgYXJlIHZhbGlkIHZhbHVlc1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc29ydERpcjogJ2FzYycsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogbmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSBmb3IgbG9jYWwgcmVzdWx0IHNvcnRpbmcuXHJcbiAgICAgICAgICAgICAqICAgIExlYXZlIG51bGwgaWYgeW91IGRvIG5vdCB3aXNoIHRoZSByZXN1bHRzIHRvIGJlIG9yZGVyZWQgb3IgaWYgdGhleSBhcmUgYWxyZWFkeSBvcmRlcmVkIHJlbW90ZWx5LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc29ydE9yZGVyOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCBzdWdnZXN0aW9ucyB3aWxsIGhhdmUgdG8gc3RhcnQgYnkgdXNlciBpbnB1dCAoYW5kIG5vdCBzaW1wbHkgY29udGFpbiBpdCBhcyBhIHN1YnN0cmluZylcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHN0cmljdFN1Z2dlc3Q6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEN1c3RvbSBzdHlsZSBhZGRlZCB0byB0aGUgY29tcG9uZW50IGNvbnRhaW5lci5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHN0eWxlOiAnJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGNvbWJvIHdpbGwgZXhwYW5kIC8gY29sbGFwc2Ugd2hlbiBjbGlja2VkIHVwb25cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHRvZ2dsZU9uQ2xpY2s6IGZhbHNlLFxyXG5cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBbW91bnQgKGluIG1zKSBiZXR3ZWVuIGtleWJvYXJkIHJlZ2lzdGVycy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHR5cGVEZWxheTogNDAwLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB0YWIgd29uJ3QgYmx1ciB0aGUgY29tcG9uZW50IGJ1dCB3aWxsIGJlIHJlZ2lzdGVyZWQgYXMgdGhlIEVOVEVSIGtleVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdXNlVGFiS2V5OiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdXNpbmcgY29tbWEgd2lsbCB2YWxpZGF0ZSB0aGUgdXNlcidzIGNob2ljZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdXNlQ29tbWFLZXk6IHRydWUsXHJcblxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIERldGVybWluZXMgd2hldGhlciBvciBub3QgdGhlIHJlc3VsdHMgd2lsbCBiZSBkaXNwbGF5ZWQgd2l0aCBhIHplYnJhIHRhYmxlIHN0eWxlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB1c2VaZWJyYVN0eWxlOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBpbml0aWFsIHZhbHVlIGZvciB0aGUgZmllbGRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHZhbHVlOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIG5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCByZXByZXNlbnRzIGl0cyB1bmRlcmx5aW5nIHZhbHVlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB2YWx1ZUZpZWxkOiAnaWQnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byB2YWxpZGF0ZSB0aGUgdmFsdWVzIGFnYWluc3RcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHZyZWdleDogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiB0eXBlIHRvIHZhbGlkYXRlIGFnYWluc3RcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHZ0eXBlOiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGNvbmYgPSAkLmV4dGVuZCh7fSxvcHRpb25zKTtcclxuICAgICAgICB2YXIgY2ZnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25mKTtcclxuXHJcbiAgICAgICAgLyoqKioqKioqKiogIFBVQkxJQyBNRVRIT0RTICoqKioqKioqKioqKi9cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBZGQgb25lIG9yIG11bHRpcGxlIGpzb24gaXRlbXMgdG8gdGhlIGN1cnJlbnQgc2VsZWN0aW9uXHJcbiAgICAgICAgICogQHBhcmFtIGl0ZW1zIC0ganNvbiBvYmplY3Qgb3IgYXJyYXkgb2YganNvbiBvYmplY3RzXHJcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcywgaXNTaWxlbnQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoIWNmZy5tYXhTZWxlY3Rpb24gfHwgX3NlbGVjdGlvbi5sZW5ndGggPCBjZmcubWF4U2VsZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoISQuaXNBcnJheShpdGVtcykpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVjaGFuZ2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5hbGxvd0R1cGxpY2F0ZXMgfHwgJC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLCBtcy5nZXRWYWx1ZSgpKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5wdXNoKGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZWNoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbXB0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1NpbGVudCAhPT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFt0aGlzLCB0aGlzLmdldFNlbGVjdGlvbigpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCAoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmIHRoaXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uXHJcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbihpc1NpbGVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbihfc2VsZWN0aW9uLnNsaWNlKDApLCBpc1NpbGVudCk7IC8vIGNsb25lIGFycmF5IHRvIGF2b2lkIGNvbmN1cnJlbmN5IGlzc3Vlc1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbGxhcHNlIHRoZSBkcm9wIGRvd24gcGFydCBvZiB0aGUgY29tYm9cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmNvbGxhcHNlID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb21ib2JveC5kZXRhY2goKTtcclxuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdjb2xsYXBzZScsIFt0aGlzXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXQgdGhlIGNvbXBvbmVudCBpbiBhIGRpc2FibGVkIHN0YXRlLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZGlzYWJsZSA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLmFkZENsYXNzKCdtcy1jdG4tZGlzYWJsZWQnKTtcclxuICAgICAgICAgICAgY2ZnLmRpc2FibGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFbXB0aWVzIG91dCB0aGUgY29tYm8gdXNlciB0ZXh0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5lbXB0eSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXQudmFsKCcnKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXQgdGhlIGNvbXBvbmVudCBpbiBhIGVuYWJsZSBzdGF0ZS5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmVuYWJsZSA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdtcy1jdG4tZGlzYWJsZWQnKTtcclxuICAgICAgICAgICAgY2ZnLmRpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ2Rpc2FibGVkJywgZmFsc2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEV4cGFuZCB0aGUgZHJvcCBkcm93biBwYXJ0IG9mIHRoZSBjb21iby5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmV4cGFuZCA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmICghY2ZnLmV4cGFuZGVkICYmICh0aGlzLmlucHV0LnZhbCgpLmxlbmd0aCA+PSBjZmcubWluQ2hhcnMgfHwgdGhpcy5jb21ib2JveC5jaGlsZHJlbigpLnNpemUoKSA+IDApKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWJvYm94LmFwcGVuZFRvKHRoaXMuY29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgY2ZnLmV4cGFuZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignZXhwYW5kJywgW3RoaXNdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHJpZXZlIGNvbXBvbmVudCBlbmFibGVkIHN0YXR1c1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiBjZmcuZGlzYWJsZWQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGZpZWxkIGlzIHZhbGlkIG9yIG5vdFxyXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5pc1ZhbGlkID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHZhbGlkID0gY2ZnLnJlcXVpcmVkID09PSBmYWxzZSB8fCBfc2VsZWN0aW9uLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgICAgIGlmKGNmZy52dHlwZSB8fCBjZmcudnJlZ2V4KXtcclxuICAgICAgICAgICAgICAgICQuZWFjaChfc2VsZWN0aW9uLCBmdW5jdGlvbihpbmRleCwgaXRlbSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsaWQgPSB2YWxpZCAmJiBzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0oaXRlbVtjZmcudmFsdWVGaWVsZF0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHZhbGlkO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEdldHMgdGhlIGRhdGEgcGFyYW1zIGZvciBjdXJyZW50IGFqYXggcmVxdWVzdFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZ2V0RGF0YVVybFBhcmFtcyA9IGZ1bmN0aW9uKClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHJldHVybiBjZmcuZGF0YVVybFBhcmFtcztcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBHZXRzIHRoZSBuYW1lIGdpdmVuIHRvIHRoZSBmb3JtIGlucHV0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5nZXROYW1lID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNmZy5uYW1lO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHJpZXZlIGFuIGFycmF5IG9mIHNlbGVjdGVkIGpzb24gb2JqZWN0c1xyXG4gICAgICAgICAqIEByZXR1cm4ge0FycmF5fVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0aW9uID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIF9zZWxlY3Rpb247XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmUgdGhlIGN1cnJlbnQgdGV4dCBlbnRlcmVkIGJ5IHRoZSB1c2VyXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5nZXRSYXdWYWx1ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHJldHVybiBtcy5pbnB1dC52YWwoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXRyaWV2ZSBhbiBhcnJheSBvZiBzZWxlY3RlZCB2YWx1ZXNcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmdldFZhbHVlID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuICQubWFwKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKG8pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvW2NmZy52YWx1ZUZpZWxkXTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVtb3ZlIG9uZSBvciBtdWx0aXBsZXMganNvbiBpdGVtcyBmcm9tIHRoZSBjdXJyZW50IHNlbGVjdGlvblxyXG4gICAgICAgICAqIEBwYXJhbSBpdGVtcyAtIGpzb24gb2JqZWN0IG9yIGFycmF5IG9mIGpzb24gb2JqZWN0c1xyXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcywgaXNTaWxlbnQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoISQuaXNBcnJheShpdGVtcykpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW1zID0gW2l0ZW1zXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgdmFsdWVjaGFuZ2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICQuZWFjaChpdGVtcywgZnVuY3Rpb24oaW5kZXgsIGpzb24pIHtcclxuICAgICAgICAgICAgICAgIHZhciBpID0gJC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLCBtcy5nZXRWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgIGlmIChpID4gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZWNoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKHZhbHVlY2hhbmdlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICBpZihpc1NpbGVudCAhPT0gdHJ1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbdGhpcywgdGhpcy5nZXRTZWxlY3Rpb24oKV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZE9uRm9jdXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEdldCBjdXJyZW50IGRhdGFcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmdldERhdGEgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICByZXR1cm4gX2NiRGF0YTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXQgdXAgc29tZSBjb21ibyBkYXRhIGFmdGVyIGl0IGhhcyBiZWVuIHJlbmRlcmVkXHJcbiAgICAgICAgICogQHBhcmFtIGRhdGFcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKXtcclxuICAgICAgICAgICAgY2ZnLmRhdGEgPSBkYXRhO1xyXG4gICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXRzIHRoZSBuYW1lIGZvciB0aGUgaW5wdXQgZmllbGQgc28gaXQgY2FuIGJlIGZldGNoZWQgaW4gdGhlIGZvcm1cclxuICAgICAgICAgKiBAcGFyYW0gbmFtZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuc2V0TmFtZSA9IGZ1bmN0aW9uKG5hbWUpe1xyXG4gICAgICAgICAgICBjZmcubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgIGlmKG5hbWUpe1xyXG4gICAgICAgICAgICAgICAgY2ZnLm5hbWUgKz0gbmFtZS5pbmRleE9mKCdbXScpID4gMCA/ICcnIDogJ1tdJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIpe1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKG1zLl92YWx1ZUNvbnRhaW5lci5jaGlsZHJlbigpLCBmdW5jdGlvbihpLCBlbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgZWwubmFtZSA9IGNmZy5uYW1lO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXRzIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aXRoIHRoZSBKU09OIGl0ZW1zIHByb3ZpZGVkXHJcbiAgICAgICAgICogQHBhcmFtIGl0ZW1zXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5zZXRTZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcyl7XHJcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU2V0cyBhIHZhbHVlIGZvciB0aGUgY29tYm8gYm94LiBWYWx1ZSBtdXN0IGJlIGFuIGFycmF5IG9mIHZhbHVlcyB3aXRoIGRhdGEgdHlwZSBtYXRjaGluZyB2YWx1ZUZpZWxkIG9uZS5cclxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZXMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgaXRlbXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgICQuZWFjaCh2YWx1ZXMsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gZmlyc3QgdHJ5IHRvIHNlZSBpZiB3ZSBoYXZlIHRoZSBmdWxsIG9iamVjdHMgZnJvbSBvdXIgZGF0YSBzZXRcclxuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKF9jYkRhdGEsIGZ1bmN0aW9uKGksaXRlbSl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoaXRlbVtjZmcudmFsdWVGaWVsZF0gPT0gdmFsdWUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmKCFmb3VuZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKHZhbHVlKSA9PT0gJ29iamVjdCcpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIganNvbiA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW2NmZy52YWx1ZUZpZWxkXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW2NmZy5kaXNwbGF5RmllbGRdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goanNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYoaXRlbXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXRzIGRhdGEgcGFyYW1zIGZvciBzdWJzZXF1ZW50IGFqYXggcmVxdWVzdHNcclxuICAgICAgICAgKiBAcGFyYW0gcGFyYW1zXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5zZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY2ZnLmRhdGFVcmxQYXJhbXMgPSAkLmV4dGVuZCh7fSxwYXJhbXMpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKioqKioqKioqICBQUklWQVRFICoqKioqKioqKioqKi9cclxuICAgICAgICB2YXIgX3NlbGVjdGlvbiA9IFtdLCAgICAgIC8vIHNlbGVjdGVkIG9iamVjdHNcclxuICAgICAgICAgICAgX2NvbWJvSXRlbUhlaWdodCA9IDAsIC8vIGhlaWdodCBmb3IgZWFjaCBjb21ibyBpdGVtLlxyXG4gICAgICAgICAgICBfdGltZXIsXHJcbiAgICAgICAgICAgIF9oYXNGb2N1cyA9IGZhbHNlLFxyXG4gICAgICAgICAgICBfZ3JvdXBzID0gbnVsbCxcclxuICAgICAgICAgICAgX2NiRGF0YSA9IFtdLFxyXG4gICAgICAgICAgICBfY3RybERvd24gPSBmYWxzZSxcclxuICAgICAgICAgICAgS0VZQ09ERVMgPSB7XHJcbiAgICAgICAgICAgICAgICBCQUNLU1BBQ0U6IDgsXHJcbiAgICAgICAgICAgICAgICBUQUI6IDksXHJcbiAgICAgICAgICAgICAgICBFTlRFUjogMTMsXHJcbiAgICAgICAgICAgICAgICBDVFJMOiAxNyxcclxuICAgICAgICAgICAgICAgIEVTQzogMjcsXHJcbiAgICAgICAgICAgICAgICBTUEFDRTogMzIsXHJcbiAgICAgICAgICAgICAgICBVUEFSUk9XOiAzOCxcclxuICAgICAgICAgICAgICAgIERPV05BUlJPVzogNDAsXHJcbiAgICAgICAgICAgICAgICBDT01NQTogMTg4XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBzZWxmID0ge1xyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEVtcHRpZXMgdGhlIHJlc3VsdCBjb250YWluZXIgYW5kIHJlZmlsbHMgaXQgd2l0aCB0aGUgYXJyYXkgb2YganNvbiByZXN1bHRzIGluIGlucHV0XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfZGlzcGxheVN1Z2dlc3Rpb25zOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5lbXB0eSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciByZXNIZWlnaHQgPSAwLCAvLyB0b3RhbCBoZWlnaHQgdGFrZW4gYnkgZGlzcGxheWVkIHJlc3VsdHMuXHJcbiAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKF9ncm91cHMgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IF9jb21ib0l0ZW1IZWlnaHQgKiBkYXRhLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgZ3JwTmFtZSBpbiBfZ3JvdXBzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5iR3JvdXBzICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtZ3JvdXAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogZ3JwTmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlckNvbWJvSXRlbXMoX2dyb3Vwc1tncnBOYW1lXS5pdGVtcywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBfZ3JvdXBJdGVtSGVpZ2h0ID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1ncm91cCcpLm91dGVySGVpZ2h0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoX2dyb3VwSXRlbUhlaWdodCAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHRtcFJlc0hlaWdodCA9IG5iR3JvdXBzICogX2dyb3VwSXRlbUhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IChfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGgpICsgdG1wUmVzSGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSBfY29tYm9JdGVtSGVpZ2h0ICogKGRhdGEubGVuZ3RoICsgbmJHcm91cHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihyZXNIZWlnaHQgPCBtcy5jb21ib2JveC5oZWlnaHQoKSB8fCByZXNIZWlnaHQgPD0gY2ZnLm1heERyb3BIZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oZWlnaHQocmVzSGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYocmVzSGVpZ2h0ID49IG1zLmNvbWJvYm94LmhlaWdodCgpICYmIHJlc0hlaWdodCA+IGNmZy5tYXhEcm9wSGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMSAmJiBjZmcuYXV0b1NlbGVjdCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKCc6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6bGFzdCcpLmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoY2ZnLnNlbGVjdEZpcnN0ID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpLmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRSYXdWYWx1ZSgpICE9PSBcIlwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5vU3VnZ2VzdGlvblRleHQgPSBjZmcubm9TdWdnZXN0aW9uVGV4dC5yZXBsYWNlKC9cXHtcXHsuKlxcfVxcfS8sIG1zLmlucHV0LnZhbCgpKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIobm9TdWdnZXN0aW9uVGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBXaGVuIGZyZWUgZW50cnkgaXMgb2ZmLCBhZGQgaW52YWxpZCBjbGFzcyB0byBpbnB1dCBpZiBubyBkYXRhIG1hdGNoZXNcclxuICAgICAgICAgICAgICAgIGlmKGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgJChtcy5pbnB1dCkuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQobXMuaW5wdXQpLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YganNvbiBvYmplY3RzIGZyb20gYW4gYXJyYXkgb2Ygc3RyaW5ncy5cclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIganNvbiA9IFtdO1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCBzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVudHJ5ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgZW50cnlbY2ZnLmRpc3BsYXlGaWVsZF0gPSBlbnRyeVtjZmcudmFsdWVGaWVsZF0gPSAkLnRyaW0ocyk7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbi5wdXNoKGVudHJ5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGpzb247XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogUmVwbGFjZXMgaHRtbCB3aXRoIGhpZ2hsaWdodGVkIGh0bWwgYWNjb3JkaW5nIHRvIGNhc2VcclxuICAgICAgICAgICAgICogQHBhcmFtIGh0bWxcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9oaWdobGlnaHRTdWdnZXN0aW9uOiBmdW5jdGlvbihodG1sKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcSA9IG1zLmlucHV0LnZhbCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vZXNjYXBlIHNwZWNpYWwgcmVnZXggY2hhcmFjdGVyc1xyXG4gICAgICAgICAgICAgICAgdmFyIHNwZWNpYWxDaGFyYWN0ZXJzID0gWydeJywgJyQnLCAnKicsICcrJywgJz8nLCAnLicsICcoJywgJyknLCAnOicsICchJywgJ3wnLCAneycsICd9JywgJ1snLCAnXSddO1xyXG5cclxuICAgICAgICAgICAgICAgICQuZWFjaChzcGVjaWFsQ2hhcmFjdGVycywgZnVuY3Rpb24gKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHEgPSBxLnJlcGxhY2UodmFsdWUsIFwiXFxcXFwiICsgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICBpZihxLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBodG1sOyAvLyBub3RoaW5nIGVudGVyZWQgYXMgaW5wdXRcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgZ2xvYiA9IGNmZy5tYXRjaENhc2UgPT09IHRydWUgPyAnZycgOiAnZ2knO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0bWwucmVwbGFjZShuZXcgUmVnRXhwKCcoJyArIHEgKyAnKSg/IShbXjxdKyk/PiknLCBnbG9iKSwgJzxlbT4kMTwvZW0+Jyk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogTW92ZXMgdGhlIHNlbGVjdGVkIGN1cnNvciBhbW9uZ3N0IHRoZSBsaXN0IGl0ZW1cclxuICAgICAgICAgICAgICogQHBhcmFtIGRpciAtICd1cCcgb3IgJ2Rvd24nXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfbW92ZVNlbGVjdGVkUm93OiBmdW5jdGlvbihkaXIpIHtcclxuICAgICAgICAgICAgICAgIGlmKCFjZmcuZXhwYW5kZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciBsaXN0LCBzdGFydCwgYWN0aXZlLCBzY3JvbGxQb3M7XHJcbiAgICAgICAgICAgICAgICBsaXN0ID0gbXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKTtcclxuICAgICAgICAgICAgICAgIGlmKGRpciA9PT0gJ2Rvd24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGFjdGl2ZSA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKTtcclxuICAgICAgICAgICAgICAgIGlmKGFjdGl2ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZGlyID09PSAnZG93bicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBhY3RpdmUubmV4dEFsbCgnLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpJykuZmlyc3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZXEoMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsUG9zID0gbXMuY29tYm9ib3guc2Nyb2xsVG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcCgwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnRbMF0ub2Zmc2V0VG9wICsgc3RhcnQub3V0ZXJIZWlnaHQoKSA+IG1zLmNvbWJvYm94LmhlaWdodCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3Aoc2Nyb2xsUG9zICsgX2NvbWJvSXRlbUhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gYWN0aXZlLnByZXZBbGwoJy5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKScpLmZpcnN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcChfY29tYm9JdGVtSGVpZ2h0ICogbGlzdC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0WzBdLm9mZnNldFRvcCA8IG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AobXMuY29tYm9ib3guc2Nyb2xsVG9wKCkgLSBfY29tYm9JdGVtSGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxpc3QucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7XHJcbiAgICAgICAgICAgICAgICBzdGFydC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBY2NvcmRpbmcgdG8gZ2l2ZW4gZGF0YSBhbmQgcXVlcnksIHNvcnQgYW5kIGFkZCBzdWdnZXN0aW9ucyBpbiB0aGVpciBjb250YWluZXJcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9wcm9jZXNzU3VnZ2VzdGlvbnM6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSBudWxsLCBkYXRhID0gc291cmNlIHx8IGNmZy5kYXRhO1xyXG4gICAgICAgICAgICAgICAgaWYoZGF0YSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihkYXRhKSA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhLmNhbGwobXMsIG1zLmdldFJhd1ZhbHVlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoZGF0YSkgPT09ICdzdHJpbmcnKSB7IC8vIGdldCByZXN1bHRzIGZyb20gYWpheFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdiZWZvcmVsb2FkJywgW21zXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5UGFyYW1zW2NmZy5xdWVyeVBhcmFtXSA9IG1zLmlucHV0LnZhbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gJC5leHRlbmQocXVlcnlQYXJhbXMsIGNmZy5kYXRhVXJsUGFyYW1zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJC5hamF4KCQuZXh0ZW5kKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNmZy5tZXRob2QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwYXJhbXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmVTZW5kOiBjZmcuYmVmb3JlU2VuZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGFzeW5jRGF0YSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbiA9IHR5cGVvZihhc3luY0RhdGEpID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UoYXN5bmNEYXRhKSA6IGFzeW5jRGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoanNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignbG9hZCcsIFttcywganNvbl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGYuX2FzeW5jVmFsdWVzKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2V0VmFsdWUodHlwZW9mKHNlbGYuX2FzeW5jVmFsdWVzKSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKHNlbGYuX2FzeW5jVmFsdWVzKSA6IHNlbGYuX2FzeW5jVmFsdWVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZShzZWxmLl9hc3luY1ZhbHVlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93KFwiQ291bGQgbm90IHJlYWNoIHNlcnZlclwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgY2ZnLmFqYXhDb25maWcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJlc3VsdHMgZnJvbSBsb2NhbCBhcnJheVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA+IDAgJiYgdHlwZW9mKGRhdGFbMF0pID09PSAnc3RyaW5nJykgeyAvLyByZXN1bHRzIGZyb20gYXJyYXkgb2Ygc3RyaW5nc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NiRGF0YSA9IHNlbGYuX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXkoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJlZ3VsYXIganNvbiBhcnJheSBvciBqc29uIG9iamVjdCB3aXRoIHJlc3VsdHMgcHJvcGVydHlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBkYXRhW2NmZy5yZXN1bHRzRmllbGRdIHx8IGRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBjZmcubW9kZSA9PT0gJ3JlbW90ZScgPyBfY2JEYXRhIDogc2VsZi5fc29ydEFuZFRyaW0oX2NiRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fZGlzcGxheVN1Z2dlc3Rpb25zKHNlbGYuX2dyb3VwKHNvcnRlZERhdGEpKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogUmVuZGVyIHRoZSBjb21wb25lbnQgdG8gdGhlIGdpdmVuIGlucHV0IERPTSBlbGVtZW50XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfcmVuZGVyOiBmdW5jdGlvbihlbCkge1xyXG4gICAgICAgICAgICAgICAgbXMuc2V0TmFtZShjZmcubmFtZSk7ICAvLyBtYWtlIHN1cmUgdGhlIGZvcm0gbmFtZSBpcyBjb3JyZWN0XHJcbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgbWFpbiBkaXYsIHdpbGwgcmVsYXkgdGhlIGZvY3VzIGV2ZW50cyB0byB0aGUgY29udGFpbmVkIGlucHV0IGVsZW1lbnQuXHJcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWN0biBmb3JtLWNvbnRyb2wgJyArIChjZmcucmVzdWx0QXNTdHJpbmcgPyAnbXMtYXMtc3RyaW5nICcgOiAnJykgKyBjZmcuY2xzICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1sZycpID8gJyBpbnB1dC1sZycgOiAnJykgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoJChlbCkuaGFzQ2xhc3MoJ2lucHV0LXNtJykgPyAnIGlucHV0LXNtJyA6ICcnKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuZGlzYWJsZWQgPT09IHRydWUgPyAnIG1zLWN0bi1kaXNhYmxlZCcgOiAnJykgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWN0bi1yZWFkb25seScpICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5oaWRlVHJpZ2dlciA9PT0gZmFsc2UgPyAnJyA6ICcgbXMtbm8tdHJpZ2dlcicpLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiBjZmcuc3R5bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGNmZy5pZFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cywgdGhpcykpO1xyXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmJsdXIoJC5wcm94eShoYW5kbGVycy5fb25CbHVyLCB0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIua2V5ZG93bigkLnByb3h5KGhhbmRsZXJzLl9vbktleURvd24sIHRoaXMpKTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5rZXl1cCgkLnByb3h5KGhhbmRsZXJzLl9vbktleVVwLCB0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIGlucHV0IGZpZWxkXHJcbiAgICAgICAgICAgICAgICBtcy5pbnB1dCA9ICQoJzxpbnB1dC8+JywgJC5leHRlbmQoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiBjZmcuZWRpdGFibGUgPT09IHRydWUgPyAnJyA6ICcgbXMtaW5wdXQtcmVhZG9ubHknLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlYWRvbmx5OiAhY2ZnLmVkaXRhYmxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjZmcucGxhY2Vob2xkZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNmZy5kaXNhYmxlZFxyXG4gICAgICAgICAgICAgICAgfSwgY2ZnLmlucHV0Q2ZnKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25JbnB1dEZvY3VzLCB0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Q2xpY2ssIHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgc3VnZ2VzdGlvbnMuIHdpbGwgYWx3YXlzIGJlIHBsYWNlZCBvbiBmb2N1c1xyXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3ggPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1jdG4gZHJvcGRvd24tbWVudSdcclxuICAgICAgICAgICAgICAgIH0pLmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYmluZCB0aGUgb25jbGljayBhbmQgbW91c2VvdmVyIHVzaW5nIGRlbGVnYXRlZCBldmVudHMgKG5lZWRzIGpRdWVyeSA+PSAxLjcpXHJcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5vbignY2xpY2snLCAnZGl2Lm1zLXJlcy1pdGVtJywgJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1TZWxlY3RlZCwgdGhpcykpO1xyXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3gub24oJ21vdXNlb3ZlcicsICdkaXYubXMtcmVzLWl0ZW0nLCAkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbU1vdXNlT3ZlciwgdGhpcykpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25Db250YWluZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lciA9IGNmZy5zZWxlY3Rpb25Db250YWluZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgJChtcy5zZWxlY3Rpb25Db250YWluZXIpLmFkZENsYXNzKCdtcy1zZWwtY3RuJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1jdG4nXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cywgdGhpcykpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiAhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbXMuaGVscGVyID0gJCgnPHNwYW4vPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtaGVscGVyICcgKyBjZmcuaW5mb01zZ0Nsc1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoKTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuaGVscGVyKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSB3aG9sZSB0aGluZ1xyXG4gICAgICAgICAgICAgICAgJChlbCkucmVwbGFjZVdpdGgobXMuY29udGFpbmVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZighY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib3R0b20nOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uU3RhY2tlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci53aWR0aChtcy5jb250YWluZXIud2lkdGgoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmFkZENsYXNzKCdtcy1zdGFja2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuY3NzKCdmbG9hdCcsICdsZWZ0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuc2VsZWN0aW9uQ29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0IHNpZGVcclxuICAgICAgICAgICAgICAgIGlmKGNmZy5oaWRlVHJpZ2dlciA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy50cmlnZ2VyID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtdHJpZ2dlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6ICc8ZGl2IGNsYXNzPVwibXMtdHJpZ2dlci1pY29cIj48L2Rpdj4nXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljaywgdGhpcykpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMudHJpZ2dlcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgJCh3aW5kb3cpLnJlc2l6ZSgkLnByb3h5KGhhbmRsZXJzLl9vbldpbmRvd1Jlc2l6ZWQsIHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBkbyBub3QgcGVyZm9ybSBhbiBpbml0aWFsIGNhbGwgaWYgd2UgYXJlIHVzaW5nIGFqYXggdW5sZXNzIHdlIGhhdmUgaW5pdGlhbCB2YWx1ZXNcclxuICAgICAgICAgICAgICAgIGlmKGNmZy52YWx1ZSAhPT0gbnVsbCB8fCBjZmcuZGF0YSAhPT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGNmZy5kYXRhKSA9PT0gJ3N0cmluZycpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9hc3luY1ZhbHVlcyA9IGNmZy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy52YWx1ZSAhPT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZXRWYWx1ZShjZmcudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICQoXCJib2R5XCIpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihtcy5jb250YWluZXIuaGFzQ2xhc3MoJ21zLWN0bi1mb2N1cycpICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5oYXMoZS50YXJnZXQpLmxlbmd0aCA9PT0gMCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbXMtcmVzLWl0ZW0nKSA8IDAgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoJ21zLWNsb3NlLWJ0bicpIDwgMCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXJbMF0gIT09IGUudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZW5kZXJzIGVhY2ggZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3JlbmRlckNvbWJvSXRlbXM6IGZ1bmN0aW9uKGl0ZW1zLCBpc0dyb3VwZWQpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCBodG1sID0gJyc7XHJcbiAgICAgICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNwbGF5ZWQgPSBjZmcucmVuZGVyZXIgIT09IG51bGwgPyBjZmcucmVuZGVyZXIuY2FsbChyZWYsIHZhbHVlKSA6IHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNhYmxlZCA9IGNmZy5kaXNhYmxlZEZpZWxkICE9PSBudWxsICYmIHZhbHVlW2NmZy5kaXNhYmxlZEZpZWxkXSA9PT0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0SXRlbUVsID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWl0ZW0gJyArIChpc0dyb3VwZWQgPyAnbXMtcmVzLWl0ZW0tZ3JvdXBlZCAnOicnKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGlzYWJsZWQgPyAnbXMtcmVzLWl0ZW0tZGlzYWJsZWQgJzonJykgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGluZGV4ICUgMiA9PT0gMSAmJiBjZmcudXNlWmVicmFTdHlsZSA9PT0gdHJ1ZSA/ICdtcy1yZXMtb2RkJyA6ICcnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogY2ZnLmhpZ2hsaWdodCA9PT0gdHJ1ZSA/IHNlbGYuX2hpZ2hsaWdodFN1Z2dlc3Rpb24oZGlzcGxheWVkKSA6IGRpc3BsYXllZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGEtanNvbic6IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJCgnPGRpdi8+JykuYXBwZW5kKHJlc3VsdEl0ZW1FbCkuaHRtbCgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5hcHBlbmQoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICBfY29tYm9JdGVtSGVpZ2h0ID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtOmZpcnN0Jykub3V0ZXJIZWlnaHQoKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZW5kZXJzIHRoZSBzZWxlY3RlZCBpdGVtcyBpbnRvIHRoZWlyIGNvbnRhaW5lci5cclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9yZW5kZXJTZWxlY3Rpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJlZiA9IHRoaXMsIHcgPSAwLCBpbnB1dE9mZnNldCA9IDAsIGl0ZW1zID0gW10sXHJcbiAgICAgICAgICAgICAgICAgICAgYXNUZXh0ID0gY2ZnLnJlc3VsdEFzU3RyaW5nID09PSB0cnVlICYmICFfaGFzRm9jdXM7XHJcblxyXG4gICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmZpbmQoJy5tcy1zZWwtaXRlbScpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYobXMuX3ZhbHVlQ29udGFpbmVyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgJC5lYWNoKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSl7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZEl0ZW1FbCwgZGVsSXRlbUVsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1IdG1sID0gY2ZnLnNlbGVjdGlvblJlbmRlcmVyICE9PSBudWxsID8gY2ZnLnNlbGVjdGlvblJlbmRlcmVyLmNhbGwocmVmLCB2YWx1ZSkgOiB2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbGlkQ2xzID0gc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdKSA/ICcnIDogJyBtcy1zZWwtaW52YWxpZCc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRhZyByZXByZXNlbnRpbmcgc2VsZWN0ZWQgdmFsdWVcclxuICAgICAgICAgICAgICAgICAgICBpZihhc1RleHQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWl0ZW0gbXMtc2VsLXRleHQgJyArIGNmZy5zZWxlY3Rpb25DbHMgKyB2YWxpZENscyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IHNlbGVjdGVkSXRlbUh0bWwgKyAoaW5kZXggPT09IChfc2VsZWN0aW9uLmxlbmd0aCAtIDEpID8gJycgOiBjZmcucmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtaXRlbSAnICsgY2ZnLnNlbGVjdGlvbkNscyArIHZhbGlkQ2xzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogc2VsZWN0ZWRJdGVtSHRtbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmRpc2FibGVkID09PSBmYWxzZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzbWFsbCBjcm9zcyBpbWdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbEl0ZW1FbCA9ICQoJzxzcGFuLz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWNsb3NlLWJ0bidcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbEl0ZW1FbC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRhZ1RyaWdnZXJDbGljaywgcmVmKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goc2VsZWN0ZWRJdGVtRWwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIucHJlcGVuZChpdGVtcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gc3RvcmUgdGhlIHZhbHVlcywgYmVoYXZpb3VyIG9mIG11bHRpcGxlIHNlbGVjdFxyXG4gICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiAnZGlzcGxheTogbm9uZTsnXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICQuZWFjaChtcy5nZXRWYWx1ZSgpLCBmdW5jdGlvbihpLCB2YWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBlbCA9ICQoJzxpbnB1dC8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaGlkZGVuJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY2ZnLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRUbyhtcy5fdmFsdWVDb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIuYXBwZW5kVG8obXMuc2VsZWN0aW9uQ29udGFpbmVyKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgIWNmZy5zZWxlY3Rpb25Db250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC53aWR0aCgwKTtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dE9mZnNldCA9IG1zLmlucHV0Lm9mZnNldCgpLmxlZnQgLSBtcy5zZWxlY3Rpb25Db250YWluZXIub2Zmc2V0KCkubGVmdDtcclxuICAgICAgICAgICAgICAgICAgICB3ID0gbXMuY29udGFpbmVyLndpZHRoKCkgLSBpbnB1dE9mZnNldCAtIDQyO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LndpZHRoKHcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZWxlY3QgYW4gaXRlbSBlaXRoZXIgdGhyb3VnaCBrZXlib2FyZCBvciBtb3VzZVxyXG4gICAgICAgICAgICAgKiBAcGFyYW0gaXRlbVxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3NlbGVjdEl0ZW06IGZ1bmN0aW9uKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIGlmKGNmZy5tYXhTZWxlY3Rpb24gPT09IDEpe1xyXG4gICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24gPSBbXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKGl0ZW0uZGF0YSgnanNvbicpKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0ucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZE9uRm9jdXMgPT09IGZhbHNlIHx8IF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKXtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoIV9oYXNGb2N1cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihfaGFzRm9jdXMgJiYgKGNmZy5leHBhbmRPbkZvY3VzIHx8IF9jdHJsRG93bikpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKF9jdHJsRG93bil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTb3J0cyB0aGUgcmVzdWx0cyBhbmQgY3V0IHRoZW0gZG93biB0byBtYXggIyBvZiBkaXNwbGF5ZWQgcmVzdWx0cyBhdCBvbmNlXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfc29ydEFuZFRyaW06IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZhciBxID0gbXMuZ2V0UmF3VmFsdWUoKSxcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gW10sXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRWYWx1ZXMgPSBtcy5nZXRWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgLy8gZmlsdGVyIHRoZSBkYXRhIGFjY29yZGluZyB0byBnaXZlbiBpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBvYmpbY2ZnLmRpc3BsYXlGaWVsZF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChjZmcubWF0Y2hDYXNlID09PSB0cnVlICYmIG5hbWUuaW5kZXhPZihxKSA+IC0xKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5tYXRjaENhc2UgPT09IGZhbHNlICYmIG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSkgPiAtMSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5zdHJpY3RTdWdnZXN0ID09PSBmYWxzZSB8fCBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQucHVzaChvYmopO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IGRhdGE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyB0YWtlIG91dCB0aGUgb25lcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgICAkLmVhY2goZmlsdGVyZWQsIGZ1bmN0aW9uKGluZGV4LCBvYmopIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLmFsbG93RHVwbGljYXRlcyB8fCAkLmluQXJyYXkob2JqW2NmZy52YWx1ZUZpZWxkXSwgc2VsZWN0ZWRWYWx1ZXMpID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucy5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAvLyBzb3J0IHRoZSBkYXRhXHJcbiAgICAgICAgICAgICAgICBpZihjZmcuc29ydE9yZGVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMuc29ydChmdW5jdGlvbihhLGIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYVtjZmcuc29ydE9yZGVyXSA8IGJbY2ZnLnNvcnRPcmRlcl0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAtMSA6IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYVtjZmcuc29ydE9yZGVyXSA+IGJbY2ZnLnNvcnRPcmRlcl0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAxIDogLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyB0cmltIGl0IGRvd25cclxuICAgICAgICAgICAgICAgIGlmKGNmZy5tYXhTdWdnZXN0aW9ucyAmJiBjZmcubWF4U3VnZ2VzdGlvbnMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMgPSBuZXdTdWdnZXN0aW9ucy5zbGljZSgwLCBjZmcubWF4U3VnZ2VzdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ld1N1Z2dlc3Rpb25zO1xyXG5cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIF9ncm91cDogZnVuY3Rpb24oZGF0YSl7XHJcbiAgICAgICAgICAgICAgICAvLyBidWlsZCBncm91cHNcclxuICAgICAgICAgICAgICAgIGlmKGNmZy5ncm91cEJ5ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2dyb3VwcyA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wcyA9IGNmZy5ncm91cEJ5LmluZGV4T2YoJy4nKSA+IC0xID8gY2ZnLmdyb3VwQnkuc3BsaXQoJy4nKSA6IGNmZy5ncm91cEJ5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcCA9IHZhbHVlW2NmZy5ncm91cEJ5XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKHByb3BzKSAhPSAnc3RyaW5nJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShwcm9wcy5sZW5ndGggPiAwKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcFtwcm9wcy5zaGlmdCgpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfZ3JvdXBzW3Byb3BdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9ncm91cHNbcHJvcF0gPSB7dGl0bGU6IHByb3AsIGl0ZW1zOiBbdmFsdWVdfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9ncm91cHNbcHJvcF0uaXRlbXMucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFVwZGF0ZSB0aGUgaGVscGVyIHRleHRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF91cGRhdGVIZWxwZXI6IGZ1bmN0aW9uKGh0bWwpIHtcclxuICAgICAgICAgICAgICAgIG1zLmhlbHBlci5odG1sKGh0bWwpO1xyXG4gICAgICAgICAgICAgICAgaWYoIW1zLmhlbHBlci5pcyhcIjp2aXNpYmxlXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmZhZGVJbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFZhbGlkYXRlIGFuIGl0ZW0gYWdhaW5zdCB2dHlwZSBvciB2cmVnZXhcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF92YWxpZGF0ZVNpbmdsZUl0ZW06IGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICAgICAgICAgIGlmKGNmZy52cmVnZXggIT09IG51bGwgJiYgY2ZnLnZyZWdleCBpbnN0YW5jZW9mIFJlZ0V4cCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNmZy52cmVnZXgudGVzdCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoY2ZnLnZ0eXBlICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGNmZy52dHlwZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FscGhhJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXlthLXpBLVpfXSskLykudGVzdCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FscGhhbnVtJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXlthLXpBLVowLTlfXSskLykudGVzdCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VtYWlsJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXihcXHcrKShbXFwtKy5dW1xcd10rKSpAKFxcd1tcXC1cXHddKlxcLil7MSw1fShbQS1aYS16XSl7Miw2fSQvKS50ZXN0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAndXJsJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvKCgoXmh0dHBzPyl8KF5mdHApKTpcXC9cXC8oW1xcLVxcd10rXFwuKStcXHd7MiwzfShcXC9bJVxcLVxcd10rKFxcLlxcd3syLH0pPykqKChbXFx3XFwtXFwuXFw/XFxcXFxcLytAJiM7YH49JSFdKikoXFwuXFx3ezIsfSk/KSpcXC8/KS9pKS50ZXN0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaXBhZGRyZXNzJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9JC8pLnRlc3QodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIGhhbmRsZXJzID0ge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYmx1cnJpbmcgb3V0IG9mIHRoZSBjb21wb25lbnRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbkJsdXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdtcy1jdG4tZm9jdXMnKTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XHJcbiAgICAgICAgICAgICAgICBfaGFzRm9jdXMgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmKG1zLmdldFJhd1ZhbHVlKCkgIT09ICcnICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSB0cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgb2JqW2NmZy5kaXNwbGF5RmllbGRdID0gb2JqW2NmZy52YWx1ZUZpZWxkXSA9IG1zLmdldFJhd1ZhbHVlKCkudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKG9iaik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihtcy5pc1ZhbGlkKCkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKG1zLmlucHV0LnZhbCgpICE9PSAnJyAmJiBjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5lbXB0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcignJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignYmx1cicsIFttc10pO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGhvdmVyaW5nIGFuIGVsZW1lbnQgaW4gdGhlIGNvbWJvXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25Db21ib0l0ZW1Nb3VzZU92ZXI6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICBpZighdGFyZ2V0Lmhhc0NsYXNzKCdtcy1yZXMtaXRlbS1kaXNhYmxlZCcpKXtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGFuIGl0ZW0gaXMgY2hvc2VuIGZyb20gdGhlIGxpc3RcclxuICAgICAgICAgICAgICogQHBhcmFtIGVcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbVNlbGVjdGVkOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgaWYoIXRhcmdldC5oYXNDbGFzcygnbXMtcmVzLWl0ZW0tZGlzYWJsZWQnKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGZvY3VzaW5nIG9uIHRoZSBjb250YWluZXIgZGl2LiBXaWxsIGZvY3VzIG9uIHRoZSBpbnB1dCBmaWVsZCBpbnN0ZWFkLlxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uRm9jdXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyBvbiB0aGUgaW5wdXQgdGV4dCBmaWVsZFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uSW5wdXRDbGljazogZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmIChtcy5pc0Rpc2FibGVkKCkgPT09IGZhbHNlICYmIF9oYXNGb2N1cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcudG9nZ2xlT25DbGljayA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLmV4cGFuZGVkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBmb2N1c2luZyBvbiB0aGUgaW5wdXQgdGV4dCBmaWVsZC5cclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbklucHV0Rm9jdXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhX2hhc0ZvY3VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2hhc0ZvY3VzID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYWRkQ2xhc3MoJ21zLWN0bi1mb2N1cycpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJMZW5ndGggPSBtcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyA9PT0gdHJ1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsIF9zZWxlY3Rpb24ubGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKGN1ckxlbmd0aCA8IGNmZy5taW5DaGFycykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBjdXJMZW5ndGgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2ZvY3VzJywgW21zXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gdGhlIHVzZXIgcHJlc3NlcyBhIGtleSB3aGlsZSB0aGUgY29tcG9uZW50IGhhcyBmb2N1c1xyXG4gICAgICAgICAgICAgKiBUaGlzIGlzIHdoZXJlIHdlIHdhbnQgdG8gaGFuZGxlIGFsbCBrZXlzIHRoYXQgZG9uJ3QgcmVxdWlyZSB0aGUgdXNlciBpbnB1dCBmaWVsZFxyXG4gICAgICAgICAgICAgKiBzaW5jZSBpdCBoYXNuJ3QgcmVnaXN0ZXJlZCB0aGUga2V5IGhpdCB5ZXRcclxuICAgICAgICAgICAgICogQHBhcmFtIGUga2V5RXZlbnRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbktleURvd246IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGhvdyB0YWIgc2hvdWxkIGJlIGhhbmRsZWRcclxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmUgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0JyksXHJcbiAgICAgICAgICAgICAgICAgICAgZnJlZUlucHV0ID0gbXMuaW5wdXQudmFsKCk7XHJcbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdrZXlkb3duJywgW21zLCBlXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5UQUIgJiYgKGNmZy51c2VUYWJLZXkgPT09IGZhbHNlIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgKGNmZy51c2VUYWJLZXkgPT09IHRydWUgJiYgYWN0aXZlLmxlbmd0aCA9PT0gMCAmJiBtcy5pbnB1dC52YWwoKS5sZW5ndGggPT09IDApKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5CQUNLU1BBQ0U6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dC5sZW5ndGggPT09IDAgJiYgbXMuZ2V0U2VsZWN0aW9uKCkubGVuZ3RoID4gMCAmJiBjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24ucG9wKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFttcywgbXMuZ2V0U2VsZWN0aW9uKCldKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiBtcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlRBQjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVTQzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVOVEVSOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihmcmVlSW5wdXQgIT09ICcnIHx8IGNmZy5leHBhbmRlZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DT01NQTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnVzZUNvbW1hS2V5ID09PSB0cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNUUkw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jdHJsRG93biA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX21vdmVTZWxlY3RlZFJvdyhcImRvd25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVVBBUlJPVzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJ1cFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBhIGtleSBpcyByZWxlYXNlZCB3aGlsZSB0aGUgY29tcG9uZW50IGhhcyBmb2N1c1xyXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uS2V5VXA6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmcmVlSW5wdXQgPSBtcy5nZXRSYXdWYWx1ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0VmFsaWQgPSAkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aCA+IDAgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCFjZmcubWF4RW50cnlMZW5ndGggfHwgJC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGggPD0gY2ZnLm1heEVudHJ5TGVuZ3RoKSxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCxcclxuICAgICAgICAgICAgICAgICAgICBvYmogPSB7fTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdrZXl1cCcsIFttcywgZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGltZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNvbGxhcHNlIGlmIGVzY2FwZSwgYnV0IGtlZXAgZm9jdXMuXHJcbiAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLkVTQyAmJiBjZmcuZXhwYW5kZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBpZ25vcmUgYSBidW5jaCBvZiBrZXlzXHJcbiAgICAgICAgICAgICAgICBpZigoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5UQUIgJiYgY2ZnLnVzZVRhYktleSA9PT0gZmFsc2UpIHx8IChlLmtleUNvZGUgPiBLRVlDT0RFUy5FTlRFUiAmJiBlLmtleUNvZGUgPCBLRVlDT0RFUy5TUEFDRSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLkNUUkwpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfY3RybERvd24gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVVBBUlJPVzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkRPV05BUlJPVzpcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FTlRFUjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlRBQjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSAhPT0gS0VZQ09ERVMuQ09NTUEgfHwgY2ZnLnVzZUNvbW1hS2V5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKXsgLy8gaWYgYSBzZWxlY3Rpb24gaXMgcGVyZm9ybWVkLCBzZWxlY3QgaXQgYW5kIHJlc2V0IGZpZWxkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGVjdGVkLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgbm8gc2VsZWN0aW9uIG9yIGlmIGZyZWV0ZXh0IGVudGVyZWQgYW5kIGZyZWUgZW50cmllcyBhbGxvd2VkLCBhZGQgbmV3IG9iaiB0byBzZWxlY3Rpb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaW5wdXRWYWxpZCA9PT0gdHJ1ZSAmJiBjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2NmZy5kaXNwbGF5RmllbGRdID0gb2JqW2NmZy52YWx1ZUZpZWxkXSA9IGZyZWVJbnB1dC50cmltKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5hZGRUb1NlbGVjdGlvbihvYmopO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTsgLy8gcmVzZXQgY29tYm8gc3VnZ2VzdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA8IGNmZy5taW5DaGFycykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGZyZWVJbnB1dC5sZW5ndGgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGNmZy5tYXhFbnRyeUxlbmd0aCAmJiBmcmVlSW5wdXQubGVuZ3RoID4gY2ZnLm1heEVudHJ5TGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhFbnRyeVJlbmRlcmVyLmNhbGwodGhpcywgZnJlZUlucHV0Lmxlbmd0aCAtIGNmZy5tYXhFbnRyeUxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLm1pbkNoYXJzIDw9IGZyZWVJbnB1dC5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBjZmcudHlwZURlbGF5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgdXBvbiBjcm9zcyBmb3IgZGVsZXRpb25cclxuICAgICAgICAgICAgICogQHBhcmFtIGVcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vblRhZ1RyaWdnZXJDbGljazogZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgbXMucmVtb3ZlRnJvbVNlbGVjdGlvbigkKGUuY3VycmVudFRhcmdldCkuZGF0YSgnanNvbicpKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyBvbiB0aGUgc21hbGwgdHJpZ2dlciBpbiB0aGUgcmlnaHRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vblRyaWdnZXJDbGljazogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZihtcy5pc0Rpc2FibGVkKCkgPT09IGZhbHNlICYmICEoY2ZnLmV4cGFuZE9uRm9jdXMgPT09IHRydWUgJiYgX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcigndHJpZ2dlcmNsaWNrJywgW21zXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjdXJMZW5ndGggPj0gY2ZnLm1pbkNoYXJzKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGN1ckxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSBicm93c2VyIHdpbmRvdyBpcyByZXNpemVkXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25XaW5kb3dSZXNpemVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gc3RhcnR1cCBwb2ludFxyXG4gICAgICAgIGlmKGVsZW1lbnQgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgc2VsZi5fcmVuZGVyKGVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgJC5mbi5tYWdpY1N1Z2dlc3QgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcbiAgICAgICAgdmFyIG9iaiA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgIGlmKG9iai5zaXplKCkgPT09IDEgJiYgb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0Jyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvYmouZWFjaChmdW5jdGlvbihpKSB7XHJcbiAgICAgICAgICAgIC8vIGFzc3VtZSAkKHRoaXMpIGlzIGFuIGVsZW1lbnRcclxuICAgICAgICAgICAgdmFyIGNudHIgPSAkKHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgLy8gUmV0dXJuIGVhcmx5IGlmIHRoaXMgZWxlbWVudCBhbHJlYWR5IGhhcyBhIHBsdWdpbiBpbnN0YW5jZVxyXG4gICAgICAgICAgICBpZihjbnRyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpKXtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0Jyl7IC8vIHJlbmRlcmluZyBmcm9tIHNlbGVjdFxyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhID0gW107XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLnZhbHVlID0gW107XHJcbiAgICAgICAgICAgICAgICAkLmVhY2godGhpcy5jaGlsZHJlbiwgZnVuY3Rpb24oaW5kZXgsIGNoaWxkKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihjaGlsZC5ub2RlTmFtZSAmJiBjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnb3B0aW9uJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YS5wdXNoKHtpZDogY2hpbGQudmFsdWUsIG5hbWU6IGNoaWxkLnRleHR9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoJChjaGlsZCkuYXR0cignc2VsZWN0ZWQnKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnZhbHVlLnB1c2goY2hpbGQudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBkZWYgPSB7fTtcclxuICAgICAgICAgICAgLy8gc2V0IHZhbHVlcyBmcm9tIERPTSBjb250YWluZXIgZWxlbWVudFxyXG4gICAgICAgICAgICAkLmVhY2godGhpcy5hdHRyaWJ1dGVzLCBmdW5jdGlvbihpLCBhdHQpe1xyXG4gICAgICAgICAgICAgICAgZGVmW2F0dC5uYW1lXSA9IGF0dC5uYW1lID09PSAndmFsdWUnICYmIGF0dC52YWx1ZSAhPT0gJycgPyBKU09OLnBhcnNlKGF0dC52YWx1ZSkgOiBhdHQudmFsdWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIGZpZWxkID0gbmV3IE1hZ2ljU3VnZ2VzdCh0aGlzLCAkLmV4dGVuZChbXSwgJC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHMsIG9wdGlvbnMsIGRlZikpO1xyXG4gICAgICAgICAgICBjbnRyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcsIGZpZWxkKTtcclxuICAgICAgICAgICAgZmllbGQuY29udGFpbmVyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcsIGZpZWxkKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfTtcclxuXHJcbiAgICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzID0ge307XHJcbn0pKGpRdWVyeSk7XHJcbiJdfQ==
