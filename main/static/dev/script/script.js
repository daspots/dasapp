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
}

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImdpZmZmZXIuanMiLCJsb2FkLmpzIiwic3Rhcl9jb2RlLmpzIiwic2l0ZS9uaWNvbGFzYml6ZS1tYWdpY3N1Z2dlc3QtMjMwYjA4Yi9tYWdpY3N1Z2dlc3QtbWluLmpzIiwic2l0ZS9uaWNvbGFzYml6ZS1tYWdpY3N1Z2dlc3QtMjMwYjA4Yi9tYWdpY3N1Z2dlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxNQUFNLENBQUMsUUFBUCxHQUFrQixTQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsTUFBZCxFQUFzQixJQUF0QixFQUE0QixRQUE1QjtBQUNoQixRQUFBO0lBQUEsUUFBQSxHQUFXLFFBQUEsSUFBWSxJQUFaLElBQW9CO0lBQy9CLElBQUEsR0FBTyxJQUFBLElBQVE7SUFDZixJQUFHLFNBQVMsQ0FBQyxNQUFWLEtBQW9CLENBQXZCO01BQ0UsSUFBQSxHQUFPLE9BRFQ7O0lBRUEsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFxQixDQUF4QjtNQUNFLE1BQUEsR0FBUztNQUNULElBQUEsR0FBTyxPQUZUOztJQUdBLE1BQUEsR0FBUyxNQUFBLElBQVU7QUFDbkIsU0FBQSxXQUFBOztNQUNFLElBQXdCLFNBQXhCO1FBQUEsT0FBTyxNQUFPLENBQUEsQ0FBQSxFQUFkOztBQURGO0lBRUEsU0FBQSxHQUFlLEdBQUcsQ0FBQyxNQUFKLENBQVcsS0FBWCxDQUFBLElBQXFCLENBQXhCLEdBQStCLEdBQS9CLEdBQXdDO1dBQ3BELENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxJQUFBLEVBQU0sTUFBTjtNQUNBLEdBQUEsRUFBSyxFQUFBLEdBQUcsR0FBSCxHQUFTLFNBQVQsR0FBb0IsQ0FBQyxDQUFDLENBQUMsS0FBRixDQUFRLE1BQVIsQ0FBRCxDQUR6QjtNQUVBLFdBQUEsRUFBYSxrQkFGYjtNQUdBLE9BQUEsRUFBUyxrQkFIVDtNQUlBLFFBQUEsRUFBVSxNQUpWO01BS0EsSUFBQSxFQUFTLElBQUgsR0FBYSxJQUFJLENBQUMsU0FBTCxDQUFlLElBQWYsQ0FBYixHQUF1QyxNQUw3QztNQU1BLE9BQUEsRUFBUyxTQUFDLElBQUQ7QUFDUCxZQUFBO1FBQUEsSUFBRyxJQUFJLENBQUMsTUFBTCxLQUFlLFNBQWxCO1VBQ0UsSUFBQSxHQUFPO1VBQ1AsSUFBRyxJQUFJLENBQUMsUUFBUjtZQUNFLElBQUEsR0FBTyxTQUFDLFFBQUQ7cUJBQWMsUUFBQSxDQUFTLE1BQVQsRUFBaUIsSUFBSSxDQUFDLFFBQXRCLEVBQWdDLEVBQWhDLEVBQW9DLFFBQXBDO1lBQWQsRUFEVDs7a0RBRUEsU0FBVSxRQUFXLElBQUksQ0FBQyxRQUFRLGVBSnBDO1NBQUEsTUFBQTtrREFNRSxTQUFVLGVBTlo7O01BRE8sQ0FOVDtNQWNBLEtBQUEsRUFBTyxTQUFDLEtBQUQsRUFBUSxVQUFSLEVBQW9CLFdBQXBCO0FBQ0wsWUFBQTtRQUFBLEtBQUEsR0FDRTtVQUFBLFVBQUEsRUFBWSxZQUFaO1VBQ0EsV0FBQSxFQUFhLFVBRGI7VUFFQSxZQUFBLEVBQWMsV0FGZDtVQUdBLEtBQUEsRUFBTyxLQUhQOztBQUlGO1VBQ0UsSUFBMkMsS0FBSyxDQUFDLFlBQWpEO1lBQUEsS0FBQSxHQUFRLENBQUMsQ0FBQyxTQUFGLENBQVksS0FBSyxDQUFDLFlBQWxCLEVBQVI7V0FERjtTQUFBLGNBQUE7VUFFTTtVQUNKLEtBQUEsR0FBUSxNQUhWOztRQUlBLEdBQUEsQ0FBSSxnQkFBSixFQUFzQixLQUF0QjtnREFDQSxTQUFVO01BWEwsQ0FkUDtLQURGO0VBWmdCO0FBQWxCOzs7QUNBQTtBQUFBLE1BQUE7OztFQUFBLENBQUMsU0FBQTtXQUNPLE1BQU0sQ0FBQztNQUNFLHNCQUFDLE9BQUQ7QUFDWCxZQUFBO1FBRFksSUFBQyxDQUFBLFVBQUQ7Ozs7Ozs7UUFDWixJQUFDLENBQUEsY0FBRCxHQUFrQixJQUFDLENBQUEsT0FBTyxDQUFDO1FBQzNCLElBQUMsQ0FBQSxRQUFELEdBQVksSUFBQyxDQUFBLE9BQU8sQ0FBQztRQUNyQixJQUFDLENBQUEsU0FBRCxHQUFhLElBQUMsQ0FBQSxPQUFPLENBQUM7UUFDdEIsSUFBQyxDQUFBLFVBQUQsR0FBYyxJQUFDLENBQUEsT0FBTyxDQUFDLFVBQVQsSUFBdUIsQ0FBQSxTQUFBLEdBQVUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUExQjtRQUNyQyxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFDLENBQUEsT0FBTyxDQUFDLGVBQVQsSUFBNEI7UUFDL0MsSUFBQyxDQUFBLGFBQUQsR0FBaUIsSUFBQyxDQUFBLE9BQU8sQ0FBQztRQUMxQixJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxPQUFPLENBQUM7UUFFckIsSUFBQyxDQUFBLFlBQUQsR0FBZ0I7O2FBRVAsQ0FBRSxJQUFYLENBQWdCLFFBQWhCLEVBQTBCLENBQUEsU0FBQSxLQUFBO21CQUFBLFNBQUMsQ0FBRDtxQkFDeEIsS0FBQyxDQUFBLG1CQUFELENBQXFCLENBQXJCO1lBRHdCO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQjs7UUFHQSxHQUFBLEdBQU0sSUFBSSxjQUFKLENBQUE7UUFDTixJQUFHLHdCQUFBLElBQWdCLEdBQUcsQ0FBQyxNQUF2QjtVQUNFLElBQUMsQ0FBQSxTQUFTLENBQUMsRUFBWCxDQUFjLFVBQWQsRUFBMEIsSUFBQyxDQUFBLGVBQTNCO1VBQ0EsSUFBQyxDQUFBLFNBQVMsQ0FBQyxFQUFYLENBQWMsV0FBZCxFQUEyQixJQUFDLENBQUEsZUFBNUI7VUFDQSxJQUFDLENBQUEsU0FBUyxDQUFDLEVBQVgsQ0FBYyxNQUFkLEVBQXNCLENBQUEsU0FBQSxLQUFBO21CQUFBLFNBQUMsQ0FBRDtxQkFDcEIsS0FBQyxDQUFBLG1CQUFELENBQXFCLENBQXJCO1lBRG9CO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF0QjtVQUVBLElBQUMsQ0FBQSxTQUFTLENBQUMsSUFBWCxDQUFBLEVBTEY7O1FBT0EsTUFBTSxDQUFDLGNBQVAsR0FBd0IsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTtZQUN0QixJQUFHLCtCQUFBLElBQXNCLEtBQUMsQ0FBQSxZQUFELEdBQWdCLENBQXpDO0FBQ0UscUJBQU8sS0FBQyxDQUFBLGdCQURWOztVQURzQjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7TUF0QmI7OzZCQTBCYixlQUFBLEdBQWlCLFNBQUMsQ0FBRDtRQUNmLElBQU8sc0JBQVA7QUFDRSxpQkFERjs7UUFFQSxDQUFDLENBQUMsZUFBRixDQUFBO1FBQ0EsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtRQUNBLElBQUcsQ0FBQyxDQUFDLElBQUYsS0FBVSxVQUFiO2lCQUNFLElBQUMsQ0FBQSxTQUFTLENBQUMsUUFBWCxDQUFvQixZQUFwQixFQURGO1NBQUEsTUFBQTtpQkFHRSxJQUFDLENBQUEsU0FBUyxDQUFDLFdBQVgsQ0FBdUIsWUFBdkIsRUFIRjs7TUFMZTs7NkJBVWpCLG1CQUFBLEdBQXFCLFNBQUMsQ0FBRDtBQUNuQixZQUFBO1FBQUEsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsQ0FBakI7UUFDQSxLQUFBLHNEQUFvQyxDQUFFLGVBQTlCLHFDQUErQyxDQUFFLGVBQWpELDJDQUF3RSxDQUFFO1FBQ2xGLHFCQUFHLEtBQUssQ0FBRSxnQkFBUCxHQUFnQixDQUFuQjtpQkFDRSxJQUFDLENBQUEsWUFBRCxDQUFjLEtBQWQsRUFERjs7TUFIbUI7OzZCQU1yQixZQUFBLEdBQWMsU0FBQyxLQUFEO2VBQ1osSUFBQyxDQUFBLGVBQUQsQ0FBaUIsS0FBSyxDQUFDLE1BQXZCLEVBQStCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsS0FBRCxFQUFRLElBQVI7WUFDN0IsSUFBRyxLQUFIO2NBQ0UsT0FBTyxDQUFDLEdBQVIsQ0FBWSxvQkFBWixFQUFrQyxLQUFsQztBQUNBLHFCQUZGOzttQkFHQSxLQUFDLENBQUEsYUFBRCxDQUFlLEtBQWYsRUFBc0IsSUFBdEIsRUFBNEIsQ0FBNUI7VUFKNkI7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQS9CO01BRFk7OzZCQU9kLGVBQUEsR0FBaUIsU0FBQyxDQUFELEVBQUksUUFBSjtRQUNmLElBQVUsQ0FBQSxJQUFLLENBQWY7QUFBQSxpQkFBQTs7ZUFDQSxRQUFBLENBQVMsS0FBVCxFQUFnQixJQUFDLENBQUEsVUFBakIsRUFBNkI7VUFBQyxLQUFBLEVBQU8sQ0FBUjtTQUE3QixFQUF5QyxTQUFDLEtBQUQsRUFBUSxNQUFSO1VBQ3ZDLElBQUcsS0FBSDtZQUNFLFFBQUEsQ0FBUyxLQUFUO0FBQ0Esa0JBQU0sTUFGUjs7aUJBR0EsUUFBQSxDQUFTLE1BQVQsRUFBb0IsTUFBcEI7UUFKdUMsQ0FBekM7TUFGZTs7NkJBUWpCLGFBQUEsR0FBZSxTQUFDLEtBQUQsRUFBUSxJQUFSLEVBQWMsQ0FBZDtBQUNiLFlBQUE7UUFBQSxJQUFVLENBQUEsSUFBSyxLQUFLLENBQUMsTUFBckI7QUFBQSxpQkFBQTs7ZUFDQSxJQUFDLENBQUEsV0FBRCxDQUFhLEtBQU0sQ0FBQSxDQUFBLENBQW5CLEVBQXVCLElBQUssQ0FBQSxDQUFBLENBQUUsQ0FBQyxVQUEvQiwyQ0FBMEQsQ0FBRSxPQUFqQixDQUF5QixLQUFNLENBQUEsQ0FBQSxDQUEvQixVQUEzQyxFQUErRSxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFBO21CQUM3RSxLQUFDLENBQUEsYUFBRCxDQUFlLEtBQWYsRUFBc0IsSUFBdEIsRUFBNEIsQ0FBQSxHQUFJLENBQWhDLEVBQW1DLDRCQUFuQztVQUQ2RTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0U7TUFGYTs7NkJBS2YsV0FBQSxHQUFhLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxRQUFaLEVBQXNCLFFBQXRCO0FBQ1gsWUFBQTtRQUFBLEdBQUEsR0FBTSxJQUFJLGNBQUosQ0FBQTtRQUNOLDZDQUFpQixDQUFFLGdCQUFoQixHQUF5QixDQUE1QjtVQUNFLFdBQUcsSUFBSSxDQUFDLElBQUwsRUFBQSxhQUFpQixJQUFDLENBQUEsYUFBbEIsRUFBQSxJQUFBLEtBQUg7WUFDRSxRQUFBLENBQVMsQ0FBVCxFQUFZLE1BQVosRUFBdUIsWUFBdkI7WUFDQSxRQUFBLENBQUE7QUFDQSxtQkFIRjtXQURGOztRQU1BLElBQUcscUJBQUg7VUFDRSxJQUFHLElBQUksQ0FBQyxJQUFMLEdBQVksSUFBQyxDQUFBLFFBQWhCO1lBQ0UsUUFBQSxDQUFTLENBQVQsRUFBWSxNQUFaLEVBQXVCLFNBQXZCO1lBQ0EsUUFBQSxDQUFBO0FBQ0EsbUJBSEY7V0FERjs7UUFPQSxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFYLENBQTRCLFVBQTVCLEVBQXdDLFNBQUMsS0FBRDtpQkFDdEMsUUFBQSxDQUFTLFFBQUEsQ0FBUyxLQUFLLENBQUMsTUFBTixHQUFlLEtBQUssQ0FBQyxLQUFyQixHQUE2QixLQUF0QyxDQUFUO1FBRHNDLENBQXhDO1FBR0EsR0FBRyxDQUFDLGtCQUFKLEdBQXlCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsS0FBRDtBQUN2QixnQkFBQTtZQUFBLElBQUcsR0FBRyxDQUFDLFVBQUosS0FBa0IsQ0FBckI7Y0FDRSxJQUFHLEdBQUcsQ0FBQyxNQUFKLEtBQWMsR0FBakI7Z0JBQ0UsUUFBQSxHQUFXLElBQUksQ0FBQyxLQUFMLENBQVcsR0FBRyxDQUFDLFlBQWY7Z0JBQ1gsUUFBQSxDQUFTLEtBQVQsRUFBZ0IsUUFBUSxDQUFDLE1BQXpCO2dCQUVBLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxHQUFaLENBQWdCLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxHQUFaLENBQUEsQ0FBQSxHQUFxQixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQXJDLEdBQTBDLEdBQTFEO3VCQUNBLEtBQUMsQ0FBQSxZQUFELElBQWlCLEVBTG5CO2VBQUEsTUFBQTtnQkFPRSxRQUFBLENBQVMsQ0FBVCxFQUFZLE1BQVosRUFBdUIsT0FBdkI7dUJBQ0EsS0FBQyxDQUFBLFlBQUQsSUFBaUIsRUFSbkI7ZUFERjs7VUFEdUI7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1FBWXpCLEdBQUcsQ0FBQyxJQUFKLENBQVMsTUFBVCxFQUFpQixHQUFqQixFQUFzQixJQUF0QjtRQUNBLElBQUEsR0FBTyxJQUFJLFFBQUosQ0FBQTtRQUNQLElBQUksQ0FBQyxNQUFMLENBQVksTUFBWixFQUFvQixJQUFwQjtRQUNBLEdBQUcsQ0FBQyxJQUFKLENBQVMsSUFBVDtlQUNBLFFBQUEsQ0FBQTtNQWxDVzs7Ozs7RUFoRWhCLENBQUQsQ0FBQSxDQUFBO0FBQUE7OztBQ0FBO0VBQUEsTUFBTSxDQUFDLEdBQVAsR0FBYSxTQUFBO29HQUNYLE9BQU8sQ0FBRSxtQkFBSztFQURIOztFQUliLE1BQU0sQ0FBQyxXQUFQLEdBQXFCLFNBQUE7SUFDbkIsbUJBQUEsQ0FBQTtJQUNBLG1CQUFBLENBQUE7SUFDQSx5QkFBQSxDQUFBO0lBQ0EsU0FBQSxDQUFBO0lBQ0EsaUJBQUEsQ0FBQTtXQUNBLGFBQUEsQ0FBQTtFQU5tQjs7RUFTckIsTUFBTSxDQUFDLG1CQUFQLEdBQTZCLFNBQUE7V0FDM0IsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLGNBQXRCLEVBQXNDLFNBQUE7YUFDcEMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLE1BQVIsQ0FBZSxTQUFmO0lBRG9DLENBQXRDO0VBRDJCOztFQUs3QixNQUFNLENBQUMsbUJBQVAsR0FBNkIsU0FBQTtXQUMzQixDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsY0FBdEIsRUFBc0MsU0FBQTtNQUNwQyxJQUFHLENBQUksT0FBQSxDQUFRLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsU0FBYixDQUFBLElBQTJCLGVBQW5DLENBQVA7ZUFDRSxLQUFLLENBQUMsY0FBTixDQUFBLEVBREY7O0lBRG9DLENBQXRDO0VBRDJCOztFQU03QixNQUFNLENBQUMseUJBQVAsR0FBbUMsU0FBQTtXQUNqQyxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0Isb0JBQXRCLEVBQTRDLFNBQUE7QUFDMUMsVUFBQTtNQUFBLE9BQUEsR0FBVSxDQUFBLENBQUUsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxRQUFiLENBQUY7TUFDVixPQUFPLENBQUMsS0FBUixDQUFBO01BQ0EsSUFBRyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsUUFBUixDQUFpQixRQUFqQixDQUFIO2VBQ0UsT0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiLEVBQXFCLFVBQXJCLEVBREY7T0FBQSxNQUFBO2VBR0UsT0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiLEVBQXFCLE1BQXJCLEVBSEY7O0lBSDBDLENBQTVDO0VBRGlDOztFQVVuQyxNQUFNLENBQUMsU0FBUCxHQUFtQixTQUFBO0FBQ2pCLFFBQUE7SUFBQSxJQUFHLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxNQUFWLEdBQW1CLENBQXRCO01BQ0UsV0FBQSxHQUFjLFNBQUE7UUFDWixDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxJQUFwQixDQUF5QixTQUFBO0FBQ3ZCLGNBQUE7VUFBQSxJQUFBLEdBQU8sTUFBTSxDQUFDLEdBQVAsQ0FBVyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFhLFVBQWIsQ0FBWDtVQUNQLElBQUEsR0FBTyxNQUFBLENBQUEsQ0FBUSxDQUFDLElBQVQsQ0FBYyxJQUFkLEVBQXFCLE1BQXJCO1VBQ1AsSUFBRyxJQUFBLEdBQU8sRUFBVjtZQUNFLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsSUFBSSxDQUFDLEtBQUwsQ0FBQSxDQUFZLENBQUMsTUFBYixDQUFvQixZQUFwQixDQUFiLEVBREY7V0FBQSxNQUFBO1lBR0UsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxJQUFJLENBQUMsT0FBTCxDQUFBLENBQWIsRUFIRjs7aUJBSUEsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxPQUFiLEVBQXNCLElBQUksQ0FBQyxLQUFMLENBQUEsQ0FBWSxDQUFDLE1BQWIsQ0FBb0IsZ0NBQXBCLENBQXRCO1FBUHVCLENBQXpCO2VBUUEsVUFBQSxDQUFXLFNBQVMsQ0FBQyxNQUFyQixFQUE2QixJQUFBLEdBQU8sRUFBcEM7TUFUWTthQVVkLFdBQUEsQ0FBQSxFQVhGOztFQURpQjs7RUFlbkIsTUFBTSxDQUFDLGlCQUFQLEdBQTJCLFNBQUE7SUFDekIsQ0FBQSxDQUFFLGtDQUFGLENBQXFDLENBQUMsS0FBdEMsQ0FBNEMsU0FBQTtnRkFDMUMsY0FBYyxDQUFFLE9BQWhCLENBQXdCLG9CQUF4QixFQUE4QyxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUFBLENBQTlDO0lBRDBDLENBQTVDO0lBR0Esd0VBQUcsY0FBYyxDQUFFLE9BQWhCLENBQXdCLG9CQUF4QixXQUFBLEtBQWlELENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLElBQXpCLENBQUEsQ0FBcEQ7YUFDRSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUFBLEVBREY7O0VBSnlCOztFQVEzQixNQUFNLENBQUMsYUFBUCxHQUF1QixTQUFBO0lBQ3JCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxFQUFWLENBQWEsT0FBYixFQUFzQixXQUF0QixFQUFtQyxTQUFBO2FBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBaEIsR0FBdUIsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiO0lBRFUsQ0FBbkM7V0FHQSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsV0FBdEIsRUFBbUMsU0FBQyxDQUFEO2FBQ2pDLENBQUMsQ0FBQyxlQUFGLENBQUE7SUFEaUMsQ0FBbkM7RUFKcUI7O0VBUXZCLE1BQU0sQ0FBQyxtQkFBUCxHQUE2QixTQUFBO1dBQzNCLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEtBQXBCLENBQUE7RUFEMkI7O0VBSTdCLE1BQU0sQ0FBQyxpQkFBUCxHQUEyQixTQUFDLE9BQUQsRUFBVSxRQUFWOztNQUFVLFdBQVM7O0lBQzVDLG1CQUFBLENBQUE7SUFDQSxJQUFVLENBQUksT0FBZDtBQUFBLGFBQUE7O1dBRUEsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsTUFBcEIsQ0FBMkIsNkNBQUEsR0FDcUIsUUFEckIsR0FDOEIsaUhBRDlCLEdBR25CLE9BSG1CLEdBR1gsVUFIaEI7RUFKeUI7O0VBWTNCLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFNBQUMsTUFBRDtBQUNsQixRQUFBO0FBQUE7QUFBQSxTQUFBLHFDQUFBOztNQUNFLElBQUcsTUFBQSxHQUFTLElBQVo7UUFDRSxJQUFHLE1BQUEsS0FBVSxHQUFiO0FBQ0UsaUJBQVUsTUFBRCxHQUFRLEdBQVIsR0FBVyxPQUR0Qjs7QUFFQSxlQUFTLENBQUMsUUFBQSxDQUFTLE1BQUEsR0FBUyxFQUFsQixDQUFBLEdBQXdCLEVBQXpCLENBQUEsR0FBNEIsR0FBNUIsR0FBK0IsT0FIMUM7O01BSUEsTUFBQSxJQUFVO0FBTFo7RUFEa0I7QUFqRnBCOzs7QUNBQTtFQUFBLENBQUEsQ0FBRSxTQUFBO1dBQ0EsV0FBQSxDQUFBO0VBREEsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxJQUFmLENBQW9CLFNBQUE7YUFDdkIsU0FBQSxDQUFBO0lBRHVCLENBQXBCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLElBQXBCLENBQXlCLFNBQUE7YUFDNUIsY0FBQSxDQUFBO0lBRDRCLENBQXpCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxpQkFBRixDQUFvQixDQUFDLElBQXJCLENBQTBCLFNBQUE7YUFDN0IsZUFBQSxDQUFBO0lBRDZCLENBQTFCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxvQkFBRixDQUF1QixDQUFDLElBQXhCLENBQTZCLFNBQUE7YUFDaEMsa0JBQUEsQ0FBQTtJQURnQyxDQUE3QjtFQUFILENBQUY7O0VBR0EsQ0FBQSxDQUFFLFNBQUE7V0FBRyxDQUFBLENBQUUsb0JBQUYsQ0FBdUIsQ0FBQyxJQUF4QixDQUE2QixTQUFBO2FBQ2hDLGtCQUFBLENBQUE7SUFEZ0MsQ0FBN0I7RUFBSCxDQUFGOztFQUdBLENBQUEsQ0FBRSxTQUFBO1dBQUcsQ0FBQSxDQUFFLGtCQUFGLENBQXFCLENBQUMsSUFBdEIsQ0FBMkIsU0FBQTthQUM5QixvQkFBQSxDQUFBO0lBRDhCLENBQTNCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSx5QkFBRixDQUE0QixDQUFDLElBQTdCLENBQWtDLFNBQUE7YUFDckMsb0JBQUEsQ0FBQTtJQURxQyxDQUFsQztFQUFILENBQUY7QUFyQkE7OztBQ0FBO0VBQUEsTUFBTSxDQUFDLFNBQVAsR0FBbUIsU0FBQTtJQUNqQixDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsTUFBZixDQUFzQixTQUFBO0FBQ3BCLFVBQUE7TUFBQSxPQUFBLEdBQVUsQ0FBQSxDQUFFLGFBQUYsQ0FBZ0IsQ0FBQyxPQUFqQixDQUFBLENBQTBCLENBQUMsTUFBM0IsQ0FBa0MsQ0FBQSxDQUFFLGtCQUFGLENBQXFCLENBQUMsT0FBdEIsQ0FBQSxDQUFsQztBQUNWO1dBQUEseUNBQUE7O1FBQ0UsSUFBQSxHQUFPLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxJQUFWLENBQWUsTUFBZjtRQUNQLElBQUcsQ0FBQSxDQUFFLGlCQUFGLENBQW9CLENBQUMsRUFBckIsQ0FBd0IsVUFBeEIsQ0FBSDtVQUNFLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxJQUFWLENBQWUsTUFBZixFQUEwQixJQUFELEdBQU0sZ0JBQS9CO3VCQUNBLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxJQUFmLENBQW9CLFNBQXBCLEVBQStCLElBQS9CLEdBRkY7U0FBQSxNQUFBO1VBSUUsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLElBQVYsQ0FBZSxNQUFmLEVBQXVCLElBQUksQ0FBQyxPQUFMLENBQWEsZ0JBQWIsRUFBK0IsRUFBL0IsQ0FBdkI7dUJBQ0EsQ0FBQSxDQUFFLFdBQUYsQ0FBYyxDQUFDLElBQWYsQ0FBb0IsU0FBcEIsRUFBK0IsS0FBL0IsR0FMRjs7QUFGRjs7SUFGb0IsQ0FBdEI7V0FXQSxDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsTUFBZixDQUFBO0VBWmlCO0FBQW5COzs7QUNDQTtFQUFBLElBQUcsQ0FBQSxDQUFFLGNBQUYsQ0FBaUIsQ0FBQyxNQUFyQjtJQUNFLENBQUEsQ0FBRSxjQUFGLENBQWlCLENBQUMsSUFBbEIsQ0FBdUIsU0FBQTtBQUNyQixVQUFBO01BQUEsV0FBQSxHQUFjLENBQUEsQ0FBRSxJQUFGO01BQ2QsVUFBQSxHQUFhLFdBQVcsQ0FBQyxJQUFaLENBQWlCLG9CQUFqQjtNQUNiLFVBQVUsQ0FBQyxJQUFYLENBQUE7TUFDQSxVQUFVLENBQUMsTUFBWCxDQUFrQixTQUFBO0FBQ2hCLFlBQUE7UUFBQSxLQUFBLEdBQVEsVUFBVyxDQUFBLENBQUEsQ0FBRSxDQUFDO1FBQ3RCLElBQUEsR0FBTztRQUNQLElBQUcsS0FBSyxDQUFDLE1BQU4sR0FBZSxDQUFsQjtVQUNFLElBQUEsR0FBVSxLQUFLLENBQUMsTUFBUCxHQUFjLGtCQUR6QjtTQUFBLE1BQUE7VUFHRSxJQUFBLEdBQU8sVUFBVSxDQUFDLEdBQVgsQ0FBQSxDQUFnQixDQUFDLEtBQWpCLENBQXVCLElBQXZCO1VBQ1AsSUFBQSxHQUFPLElBQUssQ0FBQSxJQUFJLENBQUMsTUFBTCxHQUFjLENBQWQsRUFKZDs7ZUFLQSxXQUFXLENBQUMsSUFBWixDQUFpQixvQkFBakIsQ0FBc0MsQ0FBQyxHQUF2QyxDQUEyQyxJQUEzQztNQVJnQixDQUFsQjthQVNBLFdBQVcsQ0FBQyxJQUFaLENBQWlCLGNBQWpCLENBQWdDLENBQUMsS0FBakMsQ0FBdUMsU0FBQyxDQUFEO1FBQ3JDLENBQUMsQ0FBQyxjQUFGLENBQUE7UUFDQSxVQUFVLENBQUMsS0FBWCxDQUFBO2VBQ0EsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBQTtNQUhxQyxDQUF2QztJQWJxQixDQUF2QixFQURGOztBQUFBOzs7QUNEQTtBQUFBLE1BQUE7O0VBQUEsTUFBTSxDQUFDLGtCQUFQLEdBQTRCLFNBQUE7V0FDMUIsMkJBQUEsQ0FBQTtFQUQwQjs7RUFHNUIsTUFBTSxDQUFDLGtCQUFQLEdBQTRCLFNBQUE7V0FDMUIsMkJBQUEsQ0FBQTtFQUQwQjs7RUFHNUIsTUFBTSxDQUFDLG9CQUFQLEdBQThCLFNBQUE7SUFFNUIsSUFBRyxNQUFNLENBQUMsSUFBUCxJQUFnQixNQUFNLENBQUMsUUFBdkIsSUFBb0MsTUFBTSxDQUFDLFVBQTlDO2FBQ0UsTUFBTSxDQUFDLGFBQVAsR0FBdUIsSUFBSSxZQUFKLENBQ3JCO1FBQUEsY0FBQSxFQUFnQixjQUFoQjtRQUNBLFFBQUEsRUFBVSxDQUFBLENBQUUsT0FBRixDQURWO1FBRUEsU0FBQSxFQUFXLENBQUEsQ0FBRSxZQUFGLENBRlg7UUFHQSxlQUFBLEVBQWlCLGlDQUhqQjtRQUlBLFVBQUEsRUFBWSxDQUFBLENBQUUsT0FBRixDQUFVLENBQUMsSUFBWCxDQUFnQixnQkFBaEIsQ0FKWjtRQUtBLGFBQUEsRUFBZSxFQUxmO1FBTUEsUUFBQSxFQUFVLElBQUEsR0FBTyxJQUFQLEdBQWMsSUFOeEI7T0FEcUIsRUFEekI7O0VBRjRCOztFQVk5QixjQUFBLEdBQ0U7SUFBQSxPQUFBLEVBQVMsU0FBQyxJQUFEO0FBQ1AsVUFBQTtNQUFBLFNBQUEsR0FBWSxDQUFBLENBQUUsK0hBQUEsR0FJQSxJQUFJLENBQUMsSUFKTCxHQUlVLDZLQUpaO01BWVosUUFBQSxHQUFXLENBQUEsQ0FBRSxVQUFGLEVBQWMsU0FBZDtNQUVYLElBQUcsYUFBYSxDQUFDLFlBQWQsR0FBNkIsRUFBN0IsSUFBb0MsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFWLENBQWtCLE9BQWxCLENBQUEsS0FBOEIsQ0FBckU7UUFDRSxNQUFBLEdBQVMsSUFBSSxVQUFKLENBQUE7UUFDVCxNQUFNLENBQUMsTUFBUCxHQUFnQixDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLENBQUQ7bUJBQ2QsUUFBUSxDQUFDLEdBQVQsQ0FBYSxrQkFBYixFQUFpQyxNQUFBLEdBQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFoQixHQUF1QixHQUF4RDtVQURjO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtRQUVoQixNQUFNLENBQUMsYUFBUCxDQUFxQixJQUFyQixFQUpGO09BQUEsTUFBQTtRQU1FLFFBQVEsQ0FBQyxJQUFULENBQWMsSUFBSSxDQUFDLElBQUwsSUFBYSwwQkFBM0IsRUFORjs7TUFRQSxDQUFBLENBQUUsbUJBQUYsQ0FBc0IsQ0FBQyxPQUF2QixDQUErQixTQUEvQjthQUVBLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxRQUFELEVBQVcsUUFBWCxFQUFxQixLQUFyQjtVQUNFLElBQUcsS0FBSDtZQUNFLENBQUEsQ0FBRSxlQUFGLEVBQW1CLFNBQW5CLENBQTZCLENBQUMsR0FBOUIsQ0FBa0MsT0FBbEMsRUFBMkMsTUFBM0M7WUFDQSxDQUFBLENBQUUsZUFBRixFQUFtQixTQUFuQixDQUE2QixDQUFDLFFBQTlCLENBQXVDLHFCQUF2QztZQUNBLElBQUcsS0FBQSxLQUFTLFNBQVo7Y0FDRSxDQUFBLENBQUUsZ0JBQUYsRUFBb0IsU0FBcEIsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQyx3QkFBQSxHQUF3QixDQUFDLFVBQUEsQ0FBVyxhQUFhLENBQUMsUUFBekIsQ0FBRCxDQUF4QixHQUE0RCxHQUFoRyxFQURGO2FBQUEsTUFFSyxJQUFHLEtBQUEsS0FBUyxZQUFaO2NBQ0gsQ0FBQSxDQUFFLGdCQUFGLEVBQW9CLFNBQXBCLENBQThCLENBQUMsSUFBL0IsQ0FBb0MsMEJBQXBDLEVBREc7YUFBQSxNQUFBO2NBR0gsQ0FBQSxDQUFFLGdCQUFGLEVBQW9CLFNBQXBCLENBQThCLENBQUMsSUFBL0IsQ0FBb0MsU0FBcEMsRUFIRzs7QUFJTCxtQkFURjs7VUFXQSxJQUFHLFFBQUEsS0FBWSxLQUFaLElBQXNCLFFBQXpCO1lBQ0UsQ0FBQSxDQUFFLGVBQUYsRUFBbUIsU0FBbkIsQ0FBNkIsQ0FBQyxRQUE5QixDQUF1QyxzQkFBdkM7WUFDQSxDQUFBLENBQUUsZ0JBQUYsRUFBb0IsU0FBcEIsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQyxVQUFBLEdBQVUsQ0FBQyxVQUFBLENBQVcsSUFBSSxDQUFDLElBQWhCLENBQUQsQ0FBOUM7WUFDQSxJQUFHLFFBQVEsQ0FBQyxTQUFULElBQXVCLFFBQVEsQ0FBQyxJQUFULENBQUEsQ0FBZSxDQUFDLE1BQWhCLEdBQXlCLENBQW5EO2NBQ0UsUUFBUSxDQUFDLEdBQVQsQ0FBYSxrQkFBYixFQUFpQyxNQUFBLEdBQU8sUUFBUSxDQUFDLFNBQWhCLEdBQTBCLEdBQTNEO3FCQUNBLFFBQVEsQ0FBQyxJQUFULENBQWMsRUFBZCxFQUZGO2FBSEY7V0FBQSxNQU1LLElBQUcsUUFBQSxLQUFZLEtBQWY7WUFDSCxDQUFBLENBQUUsZUFBRixFQUFtQixTQUFuQixDQUE2QixDQUFDLEdBQTlCLENBQWtDLE9BQWxDLEVBQTJDLE1BQTNDO21CQUNBLENBQUEsQ0FBRSxnQkFBRixFQUFvQixTQUFwQixDQUE4QixDQUFDLElBQS9CLENBQW9DLHFCQUFwQyxFQUZHO1dBQUEsTUFBQTtZQUlILENBQUEsQ0FBRSxlQUFGLEVBQW1CLFNBQW5CLENBQTZCLENBQUMsR0FBOUIsQ0FBa0MsT0FBbEMsRUFBOEMsUUFBRCxHQUFVLEdBQXZEO21CQUNBLENBQUEsQ0FBRSxnQkFBRixFQUFvQixTQUFwQixDQUE4QixDQUFDLElBQS9CLENBQXVDLFFBQUQsR0FBVSxPQUFWLEdBQWdCLENBQUMsVUFBQSxDQUFXLElBQUksQ0FBQyxJQUFoQixDQUFELENBQXRELEVBTEc7O1FBbEJQO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtJQXpCTyxDQUFUOzs7RUFtREYsTUFBTSxDQUFDLDJCQUFQLEdBQXFDLFNBQUE7V0FDbkMsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLGFBQXRCLEVBQXFDLFNBQUMsQ0FBRDtNQUNuQyxDQUFDLENBQUMsY0FBRixDQUFBO01BQ0EsSUFBRyxPQUFBLENBQVEsaUNBQVIsQ0FBSDtRQUNFLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixFQUF5QixVQUF6QjtlQUNBLFFBQUEsQ0FBUyxRQUFULEVBQW1CLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsU0FBYixDQUFuQixFQUE0QyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLEdBQUQsRUFBTSxNQUFOO0FBQzFDLGdCQUFBO1lBQUEsSUFBRyxHQUFIO2NBQ0UsQ0FBQSxDQUFFLEtBQUYsQ0FBTyxDQUFDLFVBQVIsQ0FBbUIsVUFBbkI7Y0FDQSxHQUFBLENBQUksOENBQUosRUFBb0QsR0FBcEQ7QUFDQSxxQkFIRjs7WUFJQSxNQUFBLEdBQVMsQ0FBQSxDQUFFLEtBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxRQUFiO1lBQ1QsWUFBQSxHQUFlLENBQUEsQ0FBRSxLQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsY0FBYjtZQUNmLElBQUcsTUFBSDtjQUNFLENBQUEsQ0FBRSxFQUFBLEdBQUcsTUFBTCxDQUFjLENBQUMsTUFBZixDQUFBLEVBREY7O1lBRUEsSUFBRyxZQUFIO3FCQUNFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBaEIsR0FBdUIsYUFEekI7O1VBVDBDO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE1QyxFQUZGOztJQUZtQyxDQUFyQztFQURtQztBQXRFckM7OztBQ0FBO0FBQUEsTUFBQTs7RUFBQSxNQUFNLENBQUMsY0FBUCxHQUF3QixTQUFBO0lBQ3RCLG9CQUFBLENBQUE7SUFDQSxvQkFBQSxDQUFBO1dBQ0EsbUJBQUEsQ0FBQTtFQUhzQjs7RUFNeEIsb0JBQUEsR0FBdUIsU0FBQTtJQUNyQixDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUFBO2FBQzVCLGVBQUEsQ0FBZ0IsQ0FBQSxDQUFFLElBQUYsQ0FBaEI7SUFENEIsQ0FBOUI7SUFHQSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLE1BQWpCLENBQXdCLFNBQUE7TUFDdEIsQ0FBQSxDQUFFLHFCQUFGLENBQXdCLENBQUMsSUFBekIsQ0FBOEIsU0FBOUIsRUFBeUMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLEVBQVIsQ0FBVyxVQUFYLENBQXpDO2FBQ0EsQ0FBQSxDQUFFLHFCQUFGLENBQXdCLENBQUMsSUFBekIsQ0FBOEIsU0FBQTtlQUM1QixlQUFBLENBQWdCLENBQUEsQ0FBRSxJQUFGLENBQWhCO01BRDRCLENBQTlCO0lBRnNCLENBQXhCO1dBS0EsQ0FBQSxDQUFFLHFCQUFGLENBQXdCLENBQUMsTUFBekIsQ0FBZ0MsU0FBQTthQUM5QixlQUFBLENBQWdCLENBQUEsQ0FBRSxJQUFGLENBQWhCO0lBRDhCLENBQWhDO0VBVHFCOztFQWF2QixlQUFBLEdBQWtCLFNBQUMsUUFBRDtJQUNoQixzQkFBQSxDQUFBO1dBQ0EsQ0FBQSxDQUFFLHFCQUFGLENBQXdCLENBQUMsSUFBekIsQ0FBOEIsU0FBQTtBQUM1QixVQUFBO01BQUEsRUFBQSxHQUFLLFFBQVEsQ0FBQyxHQUFULENBQUE7YUFDTCxDQUFBLENBQUUsR0FBQSxHQUFJLEVBQU4sQ0FBVyxDQUFDLFdBQVosQ0FBd0IsU0FBeEIsRUFBbUMsUUFBUSxDQUFDLEVBQVQsQ0FBWSxVQUFaLENBQW5DO0lBRjRCLENBQTlCO0VBRmdCOztFQU9sQixzQkFBQSxHQUF5QixTQUFBO0FBQ3ZCLFFBQUE7SUFBQSxRQUFBLEdBQVcsQ0FBQSxDQUFFLDZCQUFGLENBQWdDLENBQUM7SUFDNUMsQ0FBQSxDQUFFLGVBQUYsQ0FBa0IsQ0FBQyxXQUFuQixDQUErQixRQUEvQixFQUF5QyxRQUFBLEtBQVksQ0FBckQ7SUFDQSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLFdBQWpCLENBQTZCLFFBQTdCLEVBQXVDLFFBQUEsR0FBVyxDQUFsRDtJQUNBLElBQUcsUUFBQSxLQUFZLENBQWY7TUFDRSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLElBQWpCLENBQXNCLGVBQXRCLEVBQXVDLEtBQXZDO2FBQ0EsQ0FBQSxDQUFFLGFBQUYsQ0FBZ0IsQ0FBQyxJQUFqQixDQUFzQixTQUF0QixFQUFpQyxLQUFqQyxFQUZGO0tBQUEsTUFHSyxJQUFHLENBQUEsQ0FBRSxtQ0FBRixDQUFzQyxDQUFDLE1BQXZDLEtBQWlELENBQXBEO01BQ0gsQ0FBQSxDQUFFLGFBQUYsQ0FBZ0IsQ0FBQyxJQUFqQixDQUFzQixlQUF0QixFQUF1QyxLQUF2QzthQUNBLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsSUFBakIsQ0FBc0IsU0FBdEIsRUFBaUMsSUFBakMsRUFGRztLQUFBLE1BQUE7YUFJSCxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLElBQWpCLENBQXNCLGVBQXRCLEVBQXVDLElBQXZDLEVBSkc7O0VBUGtCOztFQWlCekIsb0JBQUEsR0FBdUIsU0FBQTtXQUNyQixDQUFBLENBQUUsY0FBRixDQUFpQixDQUFDLEtBQWxCLENBQXdCLFNBQUMsQ0FBRDtBQUN0QixVQUFBO01BQUEsbUJBQUEsQ0FBQTtNQUNBLENBQUMsQ0FBQyxjQUFGLENBQUE7TUFDQSxlQUFBLEdBQWtCLENBQUMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxTQUFiLENBQUQsQ0FBd0IsQ0FBQyxPQUF6QixDQUFpQyxTQUFqQyxFQUE0QyxDQUFBLENBQUUsNkJBQUYsQ0FBZ0MsQ0FBQyxNQUE3RTtNQUNsQixJQUFHLE9BQUEsQ0FBUSxlQUFSLENBQUg7UUFDRSxTQUFBLEdBQVk7UUFDWixDQUFBLENBQUUsNkJBQUYsQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFzQyxTQUFBO1VBQ3BDLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixFQUF5QixJQUF6QjtpQkFDQSxTQUFTLENBQUMsSUFBVixDQUFlLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxHQUFSLENBQUEsQ0FBZjtRQUZvQyxDQUF0QztRQUdBLFVBQUEsR0FBYSxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFhLFNBQWI7UUFDYixlQUFBLEdBQWtCLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsU0FBYjtRQUNsQixhQUFBLEdBQWdCLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsT0FBYjtlQUNoQixRQUFBLENBQVMsUUFBVCxFQUFtQixVQUFuQixFQUErQjtVQUFDLFNBQUEsRUFBVyxTQUFTLENBQUMsSUFBVixDQUFlLEdBQWYsQ0FBWjtTQUEvQixFQUFpRSxTQUFDLEdBQUQsRUFBTSxNQUFOO1VBQy9ELElBQUcsR0FBSDtZQUNFLENBQUEsQ0FBRSw4QkFBRixDQUFpQyxDQUFDLFVBQWxDLENBQTZDLFVBQTdDO1lBQ0EsaUJBQUEsQ0FBa0IsYUFBYSxDQUFDLE9BQWQsQ0FBc0IsU0FBdEIsRUFBaUMsU0FBUyxDQUFDLE1BQTNDLENBQWxCLEVBQXNFLFFBQXRFO0FBQ0EsbUJBSEY7O2lCQUlBLENBQUEsQ0FBRSxHQUFBLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBUCxDQUFZLEtBQVosQ0FBRCxDQUFMLENBQTJCLENBQUMsT0FBNUIsQ0FBb0MsU0FBQTtZQUNsQyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsTUFBUixDQUFBO1lBQ0Esc0JBQUEsQ0FBQTttQkFDQSxpQkFBQSxDQUFrQixlQUFlLENBQUMsT0FBaEIsQ0FBd0IsU0FBeEIsRUFBbUMsU0FBUyxDQUFDLE1BQTdDLENBQWxCLEVBQXdFLFNBQXhFO1VBSGtDLENBQXBDO1FBTCtELENBQWpFLEVBUkY7O0lBSnNCLENBQXhCO0VBRHFCOztFQTJCdkIsTUFBTSxDQUFDLGVBQVAsR0FBeUIsU0FBQTtBQUN2QixRQUFBO0lBQUEsU0FBQSxHQUFZLENBQUEsQ0FBRSxZQUFGLENBQWUsQ0FBQyxHQUFoQixDQUFBO0lBQ1osT0FBQSxHQUFVLENBQUEsQ0FBRSxVQUFGLENBQWEsQ0FBQyxJQUFkLENBQW1CLFNBQW5CO0lBQ1YsUUFBQSxDQUFTLEtBQVQsRUFBZ0IsT0FBaEIsRUFBeUI7TUFBQyxTQUFBLEVBQVcsU0FBWjtLQUF6QixFQUFpRCxTQUFDLEtBQUQsRUFBUSxNQUFSO01BQy9DLElBQUcsS0FBSDtRQUNFLEdBQUEsQ0FBSSwrQkFBSjtBQUNBLGVBRkY7O01BR0EsTUFBTSxDQUFDLFFBQVAsR0FBa0I7YUFDbEIsQ0FBQSxDQUFFLHFCQUFGLENBQXdCLENBQUMsVUFBekIsQ0FBb0MsVUFBcEM7SUFMK0MsQ0FBakQ7V0FPQSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxNQUF6QixDQUFnQyxTQUFDLEtBQUQ7QUFDOUIsVUFBQTtNQUFBLFFBQUEsR0FBVyxDQUFBLENBQUUsS0FBSyxDQUFDLGFBQVIsQ0FBc0IsQ0FBQyxHQUF2QixDQUFBO2FBQ1gsbUJBQUEsQ0FBb0IsUUFBcEI7SUFGOEIsQ0FBaEM7RUFWdUI7O0VBZXpCLG1CQUFBLEdBQXNCLFNBQUMsUUFBRDtBQUNwQixRQUFBO0lBQUEsQ0FBQSxDQUFFLFdBQUYsQ0FBYyxDQUFDLFdBQWYsQ0FBMkIsU0FBM0IsQ0FBcUMsQ0FBQyxRQUF0QyxDQUErQyxRQUEvQztJQUNBLENBQUEsQ0FBRSxHQUFBLEdBQUksUUFBTixDQUFpQixDQUFDLFdBQWxCLENBQThCLFFBQTlCLENBQXVDLENBQUMsUUFBeEMsQ0FBaUQsU0FBakQ7QUFFQTtTQUFBLDBDQUFBOztNQUNFLElBQUcsUUFBQSxLQUFZLE9BQU8sQ0FBQyxHQUF2QjtRQUNFLENBQUEsQ0FBRSxzQkFBRixDQUF5QixDQUFDLEdBQTFCLENBQThCLE9BQU8sQ0FBQyxHQUF0QztRQUNBLENBQUEsQ0FBRSxzQkFBRixDQUF5QixDQUFDLEdBQTFCLENBQThCLE9BQU8sQ0FBQyxRQUF0QztRQUNBLENBQUEsQ0FBRSxrQkFBRixDQUFxQixDQUFDLEdBQXRCLENBQTBCLE9BQU8sQ0FBQyxJQUFsQztRQUNBLENBQUEsQ0FBRSxtQkFBRixDQUFzQixDQUFDLEdBQXZCLENBQTJCLE9BQU8sQ0FBQyxLQUFuQztBQUNBLGNBTEY7T0FBQSxNQUFBOzZCQUFBOztBQURGOztFQUpvQjs7RUFhdEIsbUJBQUEsR0FBc0IsU0FBQTtXQUNwQixDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLEtBQWpCLENBQXVCLFNBQUMsQ0FBRDtBQUNyQixVQUFBO01BQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtNQUNBLFNBQUEsR0FBWTtNQUNaLENBQUEsQ0FBRSw2QkFBRixDQUFnQyxDQUFDLElBQWpDLENBQXNDLFNBQUE7ZUFDcEMsU0FBUyxDQUFDLElBQVYsQ0FBZSxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsR0FBUixDQUFBLENBQWY7TUFEb0MsQ0FBdEM7TUFFQSxjQUFBLEdBQWlCLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsZ0JBQWI7YUFDakIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFoQixHQUEwQixjQUFELEdBQWdCLGFBQWhCLEdBQTRCLENBQUMsU0FBUyxDQUFDLElBQVYsQ0FBZSxHQUFmLENBQUQ7SUFOaEMsQ0FBdkI7RUFEb0I7QUFsR3RCOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hEQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ3aW5kb3cuYXBpX2NhbGwgPSAobWV0aG9kLCB1cmwsIHBhcmFtcywgZGF0YSwgY2FsbGJhY2spIC0+XG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZGF0YSB8fCBwYXJhbXNcbiAgZGF0YSA9IGRhdGEgfHwgcGFyYW1zXG4gIGlmIGFyZ3VtZW50cy5sZW5ndGggPT0gNFxuICAgIGRhdGEgPSB1bmRlZmluZWRcbiAgaWYgYXJndW1lbnRzLmxlbmd0aCA9PSAgM1xuICAgIHBhcmFtcyA9IHVuZGVmaW5lZFxuICAgIGRhdGEgPSB1bmRlZmluZWRcbiAgcGFyYW1zID0gcGFyYW1zIHx8IHt9XG4gIGZvciBrLCB2IG9mIHBhcmFtc1xuICAgIGRlbGV0ZSBwYXJhbXNba10gaWYgbm90IHY/XG4gIHNlcGFyYXRvciA9IGlmIHVybC5zZWFyY2goJ1xcXFw/JykgPj0gMCB0aGVuICcmJyBlbHNlICc/J1xuICAkLmFqYXhcbiAgICB0eXBlOiBtZXRob2RcbiAgICB1cmw6IFwiI3t1cmx9I3tzZXBhcmF0b3J9I3skLnBhcmFtIHBhcmFtc31cIlxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICBhY2NlcHRzOiAnYXBwbGljYXRpb24vanNvbidcbiAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgZGF0YTogaWYgZGF0YSB0aGVuIEpTT04uc3RyaW5naWZ5KGRhdGEpIGVsc2UgdW5kZWZpbmVkXG4gICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICBpZiBkYXRhLnN0YXR1cyA9PSAnc3VjY2VzcydcbiAgICAgICAgbW9yZSA9IHVuZGVmaW5lZFxuICAgICAgICBpZiBkYXRhLm5leHRfdXJsXG4gICAgICAgICAgbW9yZSA9IChjYWxsYmFjaykgLT4gYXBpX2NhbGwobWV0aG9kLCBkYXRhLm5leHRfdXJsLCB7fSwgY2FsbGJhY2spXG4gICAgICAgIGNhbGxiYWNrPyB1bmRlZmluZWQsIGRhdGEucmVzdWx0LCBtb3JlXG4gICAgICBlbHNlXG4gICAgICAgIGNhbGxiYWNrPyBkYXRhXG4gICAgZXJyb3I6IChqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24pIC0+XG4gICAgICBlcnJvciA9XG4gICAgICAgIGVycm9yX2NvZGU6ICdhamF4X2Vycm9yJ1xuICAgICAgICB0ZXh0X3N0YXR1czogdGV4dFN0YXR1c1xuICAgICAgICBlcnJvcl90aHJvd246IGVycm9yVGhyb3duXG4gICAgICAgIGpxWEhSOiBqcVhIUlxuICAgICAgdHJ5XG4gICAgICAgIGVycm9yID0gJC5wYXJzZUpTT04oanFYSFIucmVzcG9uc2VUZXh0KSBpZiBqcVhIUi5yZXNwb25zZVRleHRcbiAgICAgIGNhdGNoIGVcbiAgICAgICAgZXJyb3IgPSBlcnJvclxuICAgICAgTE9HICdhcGlfY2FsbCBlcnJvcicsIGVycm9yXG4gICAgICBjYWxsYmFjaz8gZXJyb3JcbiIsIigtPlxuICBjbGFzcyB3aW5kb3cuRmlsZVVwbG9hZGVyXG4gICAgY29uc3RydWN0b3I6IChAb3B0aW9ucykgLT5cbiAgICAgIEB1cGxvYWRfaGFuZGxlciA9IEBvcHRpb25zLnVwbG9hZF9oYW5kbGVyXG4gICAgICBAc2VsZWN0b3IgPSBAb3B0aW9ucy5zZWxlY3RvclxuICAgICAgQGRyb3BfYXJlYSA9IEBvcHRpb25zLmRyb3BfYXJlYVxuICAgICAgQHVwbG9hZF91cmwgPSBAb3B0aW9ucy51cGxvYWRfdXJsIG9yIFwiL2FwaS92MSN7d2luZG93LmxvY2F0aW9uLnBhdGhuYW1lfVwiXG4gICAgICBAY29uZmlybV9tZXNzYWdlID0gQG9wdGlvbnMuY29uZmlybV9tZXNzYWdlIG9yICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xuICAgICAgQGFsbG93ZWRfdHlwZXMgPSBAb3B0aW9ucy5hbGxvd2VkX3R5cGVzXG4gICAgICBAbWF4X3NpemUgPSBAb3B0aW9ucy5tYXhfc2l6ZVxuXG4gICAgICBAYWN0aXZlX2ZpbGVzID0gMFxuXG4gICAgICBAc2VsZWN0b3I/LmJpbmQgJ2NoYW5nZScsIChlKSA9PlxuICAgICAgICBAZmlsZV9zZWxlY3RfaGFuZGxlcihlKVxuXG4gICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgQGRyb3BfYXJlYT8gYW5kIHhoci51cGxvYWRcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJhZ292ZXInLCBAZmlsZV9kcmFnX2hvdmVyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdsZWF2ZScsIEBmaWxlX2RyYWdfaG92ZXJcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJvcCcsIChlKSA9PlxuICAgICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyIGVcbiAgICAgICAgQGRyb3BfYXJlYS5zaG93KClcblxuICAgICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gPT5cbiAgICAgICAgaWYgQGNvbmZpcm1fbWVzc2FnZT8gYW5kIEBhY3RpdmVfZmlsZXMgPiAwXG4gICAgICAgICAgcmV0dXJuIEBjb25maXJtX21lc3NhZ2VcblxuICAgIGZpbGVfZHJhZ19ob3ZlcjogKGUpID0+XG4gICAgICBpZiBub3QgQGRyb3BfYXJlYT9cbiAgICAgICAgcmV0dXJuXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIGlmIGUudHlwZSBpcyAnZHJhZ292ZXInXG4gICAgICAgIEBkcm9wX2FyZWEuYWRkQ2xhc3MgJ2RyYWctaG92ZXInXG4gICAgICBlbHNlXG4gICAgICAgIEBkcm9wX2FyZWEucmVtb3ZlQ2xhc3MgJ2RyYWctaG92ZXInXG5cbiAgICBmaWxlX3NlbGVjdF9oYW5kbGVyOiAoZSkgPT5cbiAgICAgIEBmaWxlX2RyYWdfaG92ZXIoZSlcbiAgICAgIGZpbGVzID0gZS5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlcj8uZmlsZXMgb3IgZS50YXJnZXQ/LmZpbGVzIG9yIGUuZGF0YVRyYW5zZmVyPy5maWxlc1xuICAgICAgaWYgZmlsZXM/Lmxlbmd0aCA+IDBcbiAgICAgICAgQHVwbG9hZF9maWxlcyhmaWxlcylcblxuICAgIHVwbG9hZF9maWxlczogKGZpbGVzKSA9PlxuICAgICAgQGdldF91cGxvYWRfdXJscyBmaWxlcy5sZW5ndGgsIChlcnJvciwgdXJscykgPT5cbiAgICAgICAgaWYgZXJyb3JcbiAgICAgICAgICBjb25zb2xlLmxvZyAnRXJyb3IgZ2V0dGluZyBVUkxzJywgZXJyb3JcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgQHByb2Nlc3NfZmlsZXMgZmlsZXMsIHVybHMsIDBcblxuICAgIGdldF91cGxvYWRfdXJsczogKG4sIGNhbGxiYWNrKSA9PlxuICAgICAgcmV0dXJuIGlmIG4gPD0gMFxuICAgICAgYXBpX2NhbGwgJ0dFVCcsIEB1cGxvYWRfdXJsLCB7Y291bnQ6IG59LCAoZXJyb3IsIHJlc3VsdCkgLT5cbiAgICAgICAgaWYgZXJyb3JcbiAgICAgICAgICBjYWxsYmFjayBlcnJvclxuICAgICAgICAgIHRocm93IGVycm9yXG4gICAgICAgIGNhbGxiYWNrIHVuZGVmaW5lZCwgcmVzdWx0XG5cbiAgICBwcm9jZXNzX2ZpbGVzOiAoZmlsZXMsIHVybHMsIGkpID0+XG4gICAgICByZXR1cm4gaWYgaSA+PSBmaWxlcy5sZW5ndGhcbiAgICAgIEB1cGxvYWRfZmlsZSBmaWxlc1tpXSwgdXJsc1tpXS51cGxvYWRfdXJsLCBAdXBsb2FkX2hhbmRsZXI/LnByZXZpZXcoZmlsZXNbaV0pLCAoKSA9PlxuICAgICAgICBAcHJvY2Vzc19maWxlcyBmaWxlcywgdXJscywgaSArIDEsIEB1cGxvYWRfaGFuZGxlcj9cblxuICAgIHVwbG9hZF9maWxlOiAoZmlsZSwgdXJsLCBwcm9ncmVzcywgY2FsbGJhY2spID0+XG4gICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgQGFsbG93ZWRfdHlwZXM/Lmxlbmd0aCA+IDBcbiAgICAgICAgaWYgZmlsZS50eXBlIG5vdCBpbiBAYWxsb3dlZF90eXBlc1xuICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ3dyb25nX3R5cGUnXG4gICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgIHJldHVyblxuXG4gICAgICBpZiBAbWF4X3NpemU/XG4gICAgICAgIGlmIGZpbGUuc2l6ZSA+IEBtYXhfc2l6ZVxuICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ3Rvb19iaWcnXG4gICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAjICQoJyNpbWFnZScpLnZhbChmaWxlLm5hbWUpO1xuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyICdwcm9ncmVzcycsIChldmVudCkgLT5cbiAgICAgICAgcHJvZ3Jlc3MgcGFyc2VJbnQgZXZlbnQubG9hZGVkIC8gZXZlbnQudG90YWwgKiAxMDAuMFxuXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKGV2ZW50KSA9PlxuICAgICAgICBpZiB4aHIucmVhZHlTdGF0ZSA9PSA0XG4gICAgICAgICAgaWYgeGhyLnN0YXR1cyA9PSAyMDBcbiAgICAgICAgICAgIHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KVxuICAgICAgICAgICAgcHJvZ3Jlc3MgMTAwLjAsIHJlc3BvbnNlLnJlc3VsdFxuICAgICAgICAgICAgIyAvLyQoJyNjb250ZW50JykudmFsKHhoci5yZXNwb25zZVRleHQpXG4gICAgICAgICAgICAkKCcjaW1hZ2UnKS52YWwoJCgnI2ltYWdlJykudmFsKCkgICsgcmVzcG9uc2UucmVzdWx0LmlkICsgJzsnKTtcbiAgICAgICAgICAgIEBhY3RpdmVfZmlsZXMgLT0gMVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ2Vycm9yJ1xuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXG5cbiAgICAgIHhoci5vcGVuICdQT1NUJywgdXJsLCB0cnVlXG4gICAgICBkYXRhID0gbmV3IEZvcm1EYXRhKClcbiAgICAgIGRhdGEuYXBwZW5kICdmaWxlJywgZmlsZVxuICAgICAgeGhyLnNlbmQgZGF0YVxuICAgICAgY2FsbGJhY2soKVxuKSgpIiwid2luZG93LkxPRyA9IC0+XG4gIGNvbnNvbGU/LmxvZz8gYXJndW1lbnRzLi4uXG5cblxud2luZG93LmluaXRfY29tbW9uID0gLT5cbiAgaW5pdF9sb2FkaW5nX2J1dHRvbigpXG4gIGluaXRfY29uZmlybV9idXR0b24oKVxuICBpbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uKClcbiAgaW5pdF90aW1lKClcbiAgaW5pdF9hbm5vdW5jZW1lbnQoKVxuICBpbml0X3Jvd19saW5rKClcblxuXG53aW5kb3cuaW5pdF9sb2FkaW5nX2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1sb2FkaW5nJywgLT5cbiAgICAkKHRoaXMpLmJ1dHRvbiAnbG9hZGluZydcblxuXG53aW5kb3cuaW5pdF9jb25maXJtX2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1jb25maXJtJywgLT5cbiAgICBpZiBub3QgY29uZmlybSAkKHRoaXMpLmRhdGEoJ21lc3NhZ2UnKSBvciAnQXJlIHlvdSBzdXJlPydcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuXG53aW5kb3cuaW5pdF9wYXNzd29yZF9zaG93X2J1dHRvbiA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1wYXNzd29yZC1zaG93JywgLT5cbiAgICAkdGFyZ2V0ID0gJCgkKHRoaXMpLmRhdGEgJ3RhcmdldCcpXG4gICAgJHRhcmdldC5mb2N1cygpXG4gICAgaWYgJCh0aGlzKS5oYXNDbGFzcyAnYWN0aXZlJ1xuICAgICAgJHRhcmdldC5hdHRyICd0eXBlJywgJ3Bhc3N3b3JkJ1xuICAgIGVsc2VcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICd0ZXh0J1xuXG5cbndpbmRvdy5pbml0X3RpbWUgPSAtPlxuICBpZiAkKCd0aW1lJykubGVuZ3RoID4gMFxuICAgIHJlY2FsY3VsYXRlID0gLT5cbiAgICAgICQoJ3RpbWVbZGF0ZXRpbWVdJykuZWFjaCAtPlxuICAgICAgICBkYXRlID0gbW9tZW50LnV0YyAkKHRoaXMpLmF0dHIgJ2RhdGV0aW1lJ1xuICAgICAgICBkaWZmID0gbW9tZW50KCkuZGlmZiBkYXRlICwgJ2RheXMnXG4gICAgICAgIGlmIGRpZmYgPiAyNVxuICAgICAgICAgICQodGhpcykudGV4dCBkYXRlLmxvY2FsKCkuZm9ybWF0ICdZWVlZLU1NLUREJ1xuICAgICAgICBlbHNlXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUuZnJvbU5vdygpXG4gICAgICAgICQodGhpcykuYXR0ciAndGl0bGUnLCBkYXRlLmxvY2FsKCkuZm9ybWF0ICdkZGRkLCBNTU1NIERvIFlZWVksIEhIOm1tOnNzIFonXG4gICAgICBzZXRUaW1lb3V0IGFyZ3VtZW50cy5jYWxsZWUsIDEwMDAgKiA0NVxuICAgIHJlY2FsY3VsYXRlKClcblxuXG53aW5kb3cuaW5pdF9hbm5vdW5jZW1lbnQgPSAtPlxuICAkKCcuYWxlcnQtYW5ub3VuY2VtZW50IGJ1dHRvbi5jbG9zZScpLmNsaWNrIC0+XG4gICAgc2Vzc2lvblN0b3JhZ2U/LnNldEl0ZW0gJ2Nsb3NlZEFubm91bmNlbWVudCcsICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5odG1sKClcblxuICBpZiBzZXNzaW9uU3RvcmFnZT8uZ2V0SXRlbSgnY2xvc2VkQW5ub3VuY2VtZW50JykgIT0gJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLmh0bWwoKVxuICAgICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5zaG93KClcblxuXG53aW5kb3cuaW5pdF9yb3dfbGluayA9IC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLnJvdy1saW5rJywgLT5cbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICQodGhpcykuZGF0YSAnaHJlZidcblxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5ub3QtbGluaycsIChlKSAtPlxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcblxuXG53aW5kb3cuY2xlYXJfbm90aWZpY2F0aW9ucyA9IC0+XG4gICQoJyNub3RpZmljYXRpb25zJykuZW1wdHkoKVxuXG5cbndpbmRvdy5zaG93X25vdGlmaWNhdGlvbiA9IChtZXNzYWdlLCBjYXRlZ29yeT0nd2FybmluZycpIC0+XG4gIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxuICByZXR1cm4gaWYgbm90IG1lc3NhZ2VcblxuICAkKCcjbm90aWZpY2F0aW9ucycpLmFwcGVuZCBcIlwiXCJcbiAgICAgIDxkaXYgY2xhc3M9XCJhbGVydCBhbGVydC1kaXNtaXNzYWJsZSBhbGVydC0je2NhdGVnb3J5fVwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNsb3NlXCIgZGF0YS1kaXNtaXNzPVwiYWxlcnRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj4mdGltZXM7PC9idXR0b24+XG4gICAgICAgICN7bWVzc2FnZX1cbiAgICAgIDwvZGl2PlxuICAgIFwiXCJcIlxuXG5cbndpbmRvdy5zaXplX2h1bWFuID0gKG5ieXRlcykgLT5cbiAgZm9yIHN1ZmZpeCBpbiBbJ0InLCAnS0InLCAnTUInLCAnR0InLCAnVEInXVxuICAgIGlmIG5ieXRlcyA8IDEwMDBcbiAgICAgIGlmIHN1ZmZpeCA9PSAnQidcbiAgICAgICAgcmV0dXJuIFwiI3tuYnl0ZXN9ICN7c3VmZml4fVwiXG4gICAgICByZXR1cm4gXCIje3BhcnNlSW50KG5ieXRlcyAqIDEwKSAvIDEwfSAje3N1ZmZpeH1cIlxuICAgIG5ieXRlcyAvPSAxMDI0LjBcbiIsIiQgLT5cbiAgaW5pdF9jb21tb24oKVxuXG4kIC0+ICQoJ2h0bWwuYXV0aCcpLmVhY2ggLT5cbiAgaW5pdF9hdXRoKClcblxuJCAtPiAkKCdodG1sLnVzZXItbGlzdCcpLmVhY2ggLT5cbiAgaW5pdF91c2VyX2xpc3QoKVxuXG4kIC0+ICQoJ2h0bWwudXNlci1tZXJnZScpLmVhY2ggLT5cbiAgaW5pdF91c2VyX21lcmdlKClcblxuJCAtPiAkKCdodG1sLnJlc291cmNlLWxpc3QnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfbGlzdCgpXG5cbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS12aWV3JykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX3ZpZXcoKVxuXG4kIC0+ICQoJ2h0bWwucG9zdC1jcmVhdGUnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfdXBsb2FkKClcblxuJCAtPiAkKCdodG1sLnJlY29tbWVuZGVyLWNyZWF0ZScpLmVhY2ggLT5cbiAgaW5pdF9yZXNvdXJjZV91cGxvYWQoKVxuXG4iLCJ3aW5kb3cuaW5pdF9hdXRoID0gLT5cbiAgJCgnLnJlbWVtYmVyJykuY2hhbmdlIC0+XG4gICAgYnV0dG9ucyA9ICQoJy5idG4tc29jaWFsJykudG9BcnJheSgpLmNvbmNhdCAkKCcuYnRuLXNvY2lhbC1pY29uJykudG9BcnJheSgpXG4gICAgZm9yIGJ1dHRvbiBpbiBidXR0b25zXG4gICAgICBocmVmID0gJChidXR0b24pLnByb3AgJ2hyZWYnXG4gICAgICBpZiAkKCcucmVtZW1iZXIgaW5wdXQnKS5pcyAnOmNoZWNrZWQnXG4gICAgICAgICQoYnV0dG9uKS5wcm9wICdocmVmJywgXCIje2hyZWZ9JnJlbWVtYmVyPXRydWVcIlxuICAgICAgICAkKCcjcmVtZW1iZXInKS5wcm9wICdjaGVja2VkJywgdHJ1ZVxuICAgICAgZWxzZVxuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIGhyZWYucmVwbGFjZSAnJnJlbWVtYmVyPXRydWUnLCAnJ1xuICAgICAgICAkKCcjcmVtZW1iZXInKS5wcm9wICdjaGVja2VkJywgZmFsc2VcblxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UoKVxuIiwiIyBodHRwOi8vYmxvZy5hbm9yZ2FuLmNvbS8yMDEyLzA5LzMwL3ByZXR0eS1tdWx0aS1maWxlLXVwbG9hZC1ib290c3RyYXAtanF1ZXJ5LXR3aWctc2lsZXgvXG5pZiAkKFwiLnByZXR0eS1maWxlXCIpLmxlbmd0aFxuICAkKFwiLnByZXR0eS1maWxlXCIpLmVhY2ggKCkgLT5cbiAgICBwcmV0dHlfZmlsZSA9ICQodGhpcylcbiAgICBmaWxlX2lucHV0ID0gcHJldHR5X2ZpbGUuZmluZCgnaW5wdXRbdHlwZT1cImZpbGVcIl0nKVxuICAgIGZpbGVfaW5wdXQuaGlkZSgpXG4gICAgZmlsZV9pbnB1dC5jaGFuZ2UgKCkgLT5cbiAgICAgIGZpbGVzID0gZmlsZV9pbnB1dFswXS5maWxlc1xuICAgICAgaW5mbyA9IFwiXCJcbiAgICAgIGlmIGZpbGVzLmxlbmd0aCA+IDFcbiAgICAgICAgaW5mbyA9IFwiI3tmaWxlcy5sZW5ndGh9IGZpbGVzIHNlbGVjdGVkXCJcbiAgICAgIGVsc2VcbiAgICAgICAgcGF0aCA9IGZpbGVfaW5wdXQudmFsKCkuc3BsaXQoXCJcXFxcXCIpXG4gICAgICAgIGluZm8gPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV1cbiAgICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXAgaW5wdXRcIikudmFsKGluZm8pXG4gICAgcHJldHR5X2ZpbGUuZmluZChcIi5pbnB1dC1ncm91cFwiKS5jbGljayAoZSkgLT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgZmlsZV9pbnB1dC5jbGljaygpXG4gICAgICAkKHRoaXMpLmJsdXIoKVxuIiwid2luZG93LmluaXRfcmVzb3VyY2VfbGlzdCA9ICgpIC0+XG4gIGluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbigpXG5cbndpbmRvdy5pbml0X3Jlc291cmNlX3ZpZXcgPSAoKSAtPlxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxuXG53aW5kb3cuaW5pdF9yZXNvdXJjZV91cGxvYWQgPSAoKSAtPlxuXG4gIGlmIHdpbmRvdy5GaWxlIGFuZCB3aW5kb3cuRmlsZUxpc3QgYW5kIHdpbmRvdy5GaWxlUmVhZGVyXG4gICAgd2luZG93LmZpbGVfdXBsb2FkZXIgPSBuZXcgRmlsZVVwbG9hZGVyXG4gICAgICB1cGxvYWRfaGFuZGxlcjogdXBsb2FkX2hhbmRsZXJcbiAgICAgIHNlbGVjdG9yOiAkKCcuZmlsZScpXG4gICAgICBkcm9wX2FyZWE6ICQoJy5kcm9wLWFyZWEnKVxuICAgICAgY29uZmlybV9tZXNzYWdlOiAnRmlsZXMgYXJlIHN0aWxsIGJlaW5nIHVwbG9hZGVkLidcbiAgICAgIHVwbG9hZF91cmw6ICQoJy5maWxlJykuZGF0YSgnZ2V0LXVwbG9hZC11cmwnKVxuICAgICAgYWxsb3dlZF90eXBlczogW11cbiAgICAgIG1heF9zaXplOiAxMDI0ICogMTAyNCAqIDEwMjRcblxudXBsb2FkX2hhbmRsZXIgPVxuICBwcmV2aWV3OiAoZmlsZSkgLT5cbiAgICAkcmVzb3VyY2UgPSAkIFwiXCJcIlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLWxnLTIgY29sLW1kLTMgY29sLXNtLTQgY29sLXhzLTZcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidGh1bWJuYWlsXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJldmlld1wiPjwvZGl2PlxuICAgICAgICAgICAgPGg1PiN7ZmlsZS5uYW1lfTwvaDU+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3NcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLWJhclwiIHN0eWxlPVwid2lkdGg6IDAlO1wiPjwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtdGV4dFwiPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgXCJcIlwiXG4gICAgJHByZXZpZXcgPSAkKCcucHJldmlldycsICRyZXNvdXJjZSlcblxuICAgIGlmIGZpbGVfdXBsb2FkZXIuYWN0aXZlX2ZpbGVzIDwgMTYgYW5kIGZpbGUudHlwZS5pbmRleE9mKFwiaW1hZ2VcIikgaXMgMFxuICAgICAgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgICAgcmVhZGVyLm9ubG9hZCA9IChlKSA9PlxuICAgICAgICAkcHJldmlldy5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCBcInVybCgje2UudGFyZ2V0LnJlc3VsdH0pXCIpXG4gICAgICByZWFkZXIucmVhZEFzRGF0YVVSTChmaWxlKVxuICAgIGVsc2VcbiAgICAgICRwcmV2aWV3LnRleHQoZmlsZS50eXBlIG9yICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKVxuXG4gICAgJCgnLnJlc291cmNlLXVwbG9hZHMnKS5wcmVwZW5kKCRyZXNvdXJjZSlcblxuICAgIChwcm9ncmVzcywgcmVzb3VyY2UsIGVycm9yKSA9PlxuICAgICAgaWYgZXJyb3JcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsICcxMDAlJylcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuYWRkQ2xhc3MoJ3Byb2dyZXNzLWJhci1kYW5nZXInKVxuICAgICAgICBpZiBlcnJvciA9PSAndG9vX2JpZydcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgVG9vIGJpZywgbWF4OiAje3NpemVfaHVtYW4oZmlsZV91cGxvYWRlci5tYXhfc2l6ZSl9LlwiKVxuICAgICAgICBlbHNlIGlmIGVycm9yID09ICd3cm9uZ190eXBlJ1xuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiRmFpbGVkISBXcm9uZyBmaWxlIHR5cGUuXCIpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dCgnRmFpbGVkIScpXG4gICAgICAgIHJldHVyblxuXG4gICAgICBpZiBwcm9ncmVzcyA9PSAxMDAuMCBhbmQgcmVzb3VyY2VcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuYWRkQ2xhc3MoJ3Byb2dyZXNzLWJhci1zdWNjZXNzJylcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJTdWNjZXNzICN7c2l6ZV9odW1hbihmaWxlLnNpemUpfVwiKVxuICAgICAgICBpZiByZXNvdXJjZS5pbWFnZV91cmwgYW5kICRwcmV2aWV3LnRleHQoKS5sZW5ndGggPiAwXG4gICAgICAgICAgJHByZXZpZXcuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgXCJ1cmwoI3tyZXNvdXJjZS5pbWFnZV91cmx9KVwiKVxuICAgICAgICAgICRwcmV2aWV3LnRleHQoJycpXG4gICAgICBlbHNlIGlmIHByb2dyZXNzID09IDEwMC4wXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCAnMTAwJScpXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiMTAwJSAtIFByb2Nlc3NpbmcuLlwiKVxuICAgICAgZWxzZVxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgXCIje3Byb2dyZXNzfSVcIilcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCIje3Byb2dyZXNzfSUgb2YgI3tzaXplX2h1bWFuKGZpbGUuc2l6ZSl9XCIpXG5cblxud2luZG93LmluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbiA9ICgpIC0+XG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1kZWxldGUnLCAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBpZiBjb25maXJtKCdQcmVzcyBPSyB0byBkZWxldGUgdGhlIHJlc291cmNlJylcbiAgICAgICQodGhpcykuYXR0cignZGlzYWJsZWQnLCAnZGlzYWJsZWQnKVxuICAgICAgYXBpX2NhbGwgJ0RFTEVURScsICQodGhpcykuZGF0YSgnYXBpLXVybCcpLCAoZXJyLCByZXN1bHQpID0+XG4gICAgICAgIGlmIGVyclxuICAgICAgICAgICQodGhpcykucmVtb3ZlQXR0cignZGlzYWJsZWQnKVxuICAgICAgICAgIExPRyAnU29tZXRoaW5nIHdlbnQgdGVycmlibHkgd3JvbmcgZHVyaW5nIGRlbGV0ZSEnLCBlcnJcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgdGFyZ2V0ID0gJCh0aGlzKS5kYXRhKCd0YXJnZXQnKVxuICAgICAgICByZWRpcmVjdF91cmwgPSAkKHRoaXMpLmRhdGEoJ3JlZGlyZWN0LXVybCcpXG4gICAgICAgIGlmIHRhcmdldFxuICAgICAgICAgICQoXCIje3RhcmdldH1cIikucmVtb3ZlKClcbiAgICAgICAgaWYgcmVkaXJlY3RfdXJsXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZWRpcmVjdF91cmwiLCJ3aW5kb3cuaW5pdF91c2VyX2xpc3QgPSAtPlxuICBpbml0X3VzZXJfc2VsZWN0aW9ucygpXG4gIGluaXRfdXNlcl9kZWxldGVfYnRuKClcbiAgaW5pdF91c2VyX21lcmdlX2J0bigpXG5cblxuaW5pdF91c2VyX3NlbGVjdGlvbnMgPSAtPlxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuZWFjaCAtPlxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXG5cbiAgJCgnI3NlbGVjdC1hbGwnKS5jaGFuZ2UgLT5cbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykucHJvcCAnY2hlY2tlZCcsICQodGhpcykuaXMgJzpjaGVja2VkJ1xuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XG4gICAgICB1c2VyX3NlbGVjdF9yb3cgJCh0aGlzKVxuXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgLT5cbiAgICB1c2VyX3NlbGVjdF9yb3cgJCh0aGlzKVxuXG5cbnVzZXJfc2VsZWN0X3JvdyA9ICgkZWxlbWVudCkgLT5cbiAgdXBkYXRlX3VzZXJfc2VsZWN0aW9ucygpXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XG4gICAgaWQgPSAkZWxlbWVudC52YWwoKVxuICAgICQoXCIjI3tpZH1cIikudG9nZ2xlQ2xhc3MgJ3dhcm5pbmcnLCAkZWxlbWVudC5pcyAnOmNoZWNrZWQnXG5cblxudXBkYXRlX3VzZXJfc2VsZWN0aW9ucyA9IC0+XG4gIHNlbGVjdGVkID0gJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykubGVuZ3RoXG4gICQoJyN1c2VyLWFjdGlvbnMnKS50b2dnbGVDbGFzcyAnaGlkZGVuJywgc2VsZWN0ZWQgPT0gMFxuICAkKCcjdXNlci1tZXJnZScpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA8IDJcbiAgaWYgc2VsZWN0ZWQgaXMgMFxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnaW5kZXRlcm1pbmF0ZScsIGZhbHNlXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdjaGVja2VkJywgZmFsc2VcbiAgZWxzZSBpZiAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOm5vdCg6Y2hlY2tlZCknKS5sZW5ndGggaXMgMFxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnaW5kZXRlcm1pbmF0ZScsIGZhbHNlXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdjaGVja2VkJywgdHJ1ZVxuICBlbHNlXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgdHJ1ZVxuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgRGVsZXRlIFVzZXJzIFN0dWZmXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5pbml0X3VzZXJfZGVsZXRlX2J0biA9IC0+XG4gICQoJyN1c2VyLWRlbGV0ZScpLmNsaWNrIChlKSAtPlxuICAgIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGNvbmZpcm1fbWVzc2FnZSA9ICgkKHRoaXMpLmRhdGEgJ2NvbmZpcm0nKS5yZXBsYWNlICd7dXNlcnN9JywgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykubGVuZ3RoXG4gICAgaWYgY29uZmlybSBjb25maXJtX21lc3NhZ2VcbiAgICAgIHVzZXJfa2V5cyA9IFtdXG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XG4gICAgICAgICQodGhpcykuYXR0ciAnZGlzYWJsZWQnLCB0cnVlXG4gICAgICAgIHVzZXJfa2V5cy5wdXNoICQodGhpcykudmFsKClcbiAgICAgIGRlbGV0ZV91cmwgPSAkKHRoaXMpLmRhdGEgJ2FwaS11cmwnXG4gICAgICBzdWNjZXNzX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ3N1Y2Nlc3MnXG4gICAgICBlcnJvcl9tZXNzYWdlID0gJCh0aGlzKS5kYXRhICdlcnJvcidcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCBkZWxldGVfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXMuam9pbignLCcpfSwgKGVyciwgcmVzdWx0KSAtPlxuICAgICAgICBpZiBlcnJcbiAgICAgICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmRpc2FibGVkJykucmVtb3ZlQXR0ciAnZGlzYWJsZWQnXG4gICAgICAgICAgc2hvd19ub3RpZmljYXRpb24gZXJyb3JfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdkYW5nZXInXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgICQoXCIjI3tyZXN1bHQuam9pbignLCAjJyl9XCIpLmZhZGVPdXQgLT5cbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpXG4gICAgICAgICAgdXBkYXRlX3VzZXJfc2VsZWN0aW9ucygpXG4gICAgICAgICAgc2hvd19ub3RpZmljYXRpb24gc3VjY2Vzc19tZXNzYWdlLnJlcGxhY2UoJ3t1c2Vyc30nLCB1c2VyX2tleXMubGVuZ3RoKSwgJ3N1Y2Nlc3MnXG5cblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBNZXJnZSBVc2VycyBTdHVmZlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xud2luZG93LmluaXRfdXNlcl9tZXJnZSA9IC0+XG4gIHVzZXJfa2V5cyA9ICQoJyN1c2VyX2tleXMnKS52YWwoKVxuICBhcGlfdXJsID0gJCgnLmFwaS11cmwnKS5kYXRhICdhcGktdXJsJ1xuICBhcGlfY2FsbCAnR0VUJywgYXBpX3VybCwge3VzZXJfa2V5czogdXNlcl9rZXlzfSwgKGVycm9yLCByZXN1bHQpIC0+XG4gICAgaWYgZXJyb3JcbiAgICAgIExPRyAnU29tZXRoaW5nIHdlbnQgdGVycmlibHkgd3JvbmcnXG4gICAgICByZXR1cm5cbiAgICB3aW5kb3cudXNlcl9kYnMgPSByZXN1bHRcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykucmVtb3ZlQXR0ciAnZGlzYWJsZWQnXG5cbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAoZXZlbnQpIC0+XG4gICAgdXNlcl9rZXkgPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpXG4gICAgc2VsZWN0X2RlZmF1bHRfdXNlciB1c2VyX2tleVxuXG5cbnNlbGVjdF9kZWZhdWx0X3VzZXIgPSAodXNlcl9rZXkpIC0+XG4gICQoJy51c2VyLXJvdycpLnJlbW92ZUNsYXNzKCdzdWNjZXNzJykuYWRkQ2xhc3MgJ2RhbmdlcidcbiAgJChcIiMje3VzZXJfa2V5fVwiKS5yZW1vdmVDbGFzcygnZGFuZ2VyJykuYWRkQ2xhc3MgJ3N1Y2Nlc3MnXG5cbiAgZm9yIHVzZXJfZGIgaW4gdXNlcl9kYnNcbiAgICBpZiB1c2VyX2tleSA9PSB1c2VyX2RiLmtleVxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2tleV0nKS52YWwgdXNlcl9kYi5rZXlcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcm5hbWVdJykudmFsIHVzZXJfZGIudXNlcm5hbWVcbiAgICAgICQoJ2lucHV0W25hbWU9bmFtZV0nKS52YWwgdXNlcl9kYi5uYW1lXG4gICAgICAkKCdpbnB1dFtuYW1lPWVtYWlsXScpLnZhbCB1c2VyX2RiLmVtYWlsXG4gICAgICBicmVha1xuXG5cbmluaXRfdXNlcl9tZXJnZV9idG4gPSAtPlxuICAkKCcjdXNlci1tZXJnZScpLmNsaWNrIChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIHVzZXJfa2V5cyA9IFtdXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxuICAgICAgdXNlcl9rZXlzLnB1c2ggJCh0aGlzKS52YWwoKVxuICAgIHVzZXJfbWVyZ2VfdXJsID0gJCh0aGlzKS5kYXRhICd1c2VyLW1lcmdlLXVybCdcbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IFwiI3t1c2VyX21lcmdlX3VybH0/dXNlcl9rZXlzPSN7dXNlcl9rZXlzLmpvaW4oJywnKX1cIlxuIiwiXG5mdW5jdGlvbiBmb2xsb3dGdW5jdGlvbih4LCB5KSB7XG5cbiAgICBhcGlfdXJsID0gJy9hcGkvdjEvZm9sbG93LycgKyB5ICsgJy8nO1xuXG4gICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJsYWJlbC1kZWZhdWx0XCIpKXtcbiAgICAgICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibm90LWxvZ2dlZC1pblwiKSl7XG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XG4gICAgICAgICAgICAkKFwiLnJlY29tbWVuZGVyXCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcbiAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmZhZGVJbigpO1xuLy8gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZU91dCgpO1xuICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwibGFiZWwtZGVmYXVsdFwiKVxuICAgICAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtc3VjY2Vzc1wiKVxuICAgICAgICAgICAgeC5pbm5lckhUTUw9J0ZPTExPV0lORyc7XG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLCAgICAvL1lvdXIgYXBpIHVybFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BVVCcsICAgLy90eXBlIGlzIGFueSBIVFRQIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAgICAgIC8vRGF0YSBhcyBqcyBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibGFiZWwtc3VjY2Vzc1wiKSl7XG5cbiAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwibGFiZWwtc3VjY2Vzc1wiKVxuICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJsYWJlbC1kZWZhdWx0XCIpXG4gICAgICAgIHguaW5uZXJIVE1MID0gJ0ZPTExPVyc7XG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ0RFTEVURScsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICA7XG4gICAgfVxuXG59XG5cbiQoJy5jbG9zZS1pY29uJykub24oJ2NsaWNrJyxmdW5jdGlvbigpIHtcbiAgJCh0aGlzKS5jbG9zZXN0KCcuY2FyZCcpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcbiAgJChcIi5yZWNvbW1lbmRlclwiKS5mYWRlSW4oKTtcbn0pIiwiLy8oZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCxmYWN0b3J5KXtpZih0eXBlb2YgZXhwb3J0cz09PVwib2JqZWN0XCImJnR5cGVvZiBtb2R1bGU9PT1cIm9iamVjdFwiKW1vZHVsZS5leHBvcnRzPWZhY3RvcnkoKTtlbHNlIGlmKHR5cGVvZiBkZWZpbmU9PT1cImZ1bmN0aW9uXCImJmRlZmluZS5hbWQpZGVmaW5lKFwiR2lmZmZlclwiLFtdLGZhY3RvcnkpO2Vsc2UgaWYodHlwZW9mIGV4cG9ydHM9PT1cIm9iamVjdFwiKWV4cG9ydHNbXCJHaWZmZmVyXCJdPWZhY3RvcnkoKTtlbHNlIHJvb3RbXCJHaWZmZmVyXCJdPWZhY3RvcnkoKX0pKHRoaXMsZnVuY3Rpb24oKXt2YXIgZD1kb2N1bWVudDt2YXIgcGxheVNpemU9NjA7dmFyIEdpZmZmZXI9ZnVuY3Rpb24ob3B0aW9ucyl7dmFyIGltYWdlcyxpPTAsZ2lmcz1bXTtpbWFnZXM9ZC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtZ2lmZmZlcl1cIik7Zm9yKDtpPGltYWdlcy5sZW5ndGg7KytpKXByb2Nlc3MoaW1hZ2VzW2ldLGdpZnMsb3B0aW9ucyk7cmV0dXJuIGdpZnN9O2Z1bmN0aW9uIGZvcm1hdFVuaXQodil7cmV0dXJuIHYrKHYudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wP1wiXCI6XCJweFwiKX1mdW5jdGlvbiBwYXJzZVN0eWxlcyhzdHlsZXMpe3ZhciBzdHlsZXNTdHI9XCJcIjtmb3IocHJvcCBpbiBzdHlsZXMpc3R5bGVzU3RyKz1wcm9wK1wiOlwiK3N0eWxlc1twcm9wXStcIjtcIjtyZXR1cm4gc3R5bGVzU3RyfWZ1bmN0aW9uIGNyZWF0ZUNvbnRhaW5lcih3LGgsZWwsYWx0VGV4dCxvcHRzKXt2YXIgYWx0O3ZhciBjb249ZC5jcmVhdGVFbGVtZW50KFwiQlVUVE9OXCIpO3ZhciBjbHM9ZWwuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIik7dmFyIGlkPWVsLmdldEF0dHJpYnV0ZShcImlkXCIpO3ZhciBwbGF5QnV0dG9uU3R5bGVzPW9wdHMmJm9wdHMucGxheUJ1dHRvblN0eWxlcz9wYXJzZVN0eWxlcyhvcHRzLnBsYXlCdXR0b25TdHlsZXMpOltcIndpZHRoOlwiK3BsYXlTaXplK1wicHhcIixcImhlaWdodDpcIitwbGF5U2l6ZStcInB4XCIsXCJib3JkZXItcmFkaXVzOlwiK3BsYXlTaXplLzIrXCJweFwiLFwiYmFja2dyb3VuZDpyZ2JhKDAsIDAsIDAsIDAuMylcIixcInBvc2l0aW9uOmFic29sdXRlXCIsXCJ0b3A6NTAlXCIsXCJsZWZ0OjUwJVwiLFwibWFyZ2luOi1cIitwbGF5U2l6ZS8yK1wicHhcIl0uam9pbihcIjtcIik7dmFyIHBsYXlCdXR0b25JY29uU3R5bGVzPW9wdHMmJm9wdHMucGxheUJ1dHRvbkljb25TdHlsZXM/cGFyc2VTdHlsZXMob3B0cy5wbGF5QnV0dG9uSWNvblN0eWxlcyk6W1wid2lkdGg6IDBcIixcImhlaWdodDogMFwiLFwiYm9yZGVyLXRvcDogMTRweCBzb2xpZCB0cmFuc3BhcmVudFwiLFwiYm9yZGVyLWJvdHRvbTogMTRweCBzb2xpZCB0cmFuc3BhcmVudFwiLFwiYm9yZGVyLWxlZnQ6IDE0cHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjUpXCIsXCJwb3NpdGlvbjogYWJzb2x1dGVcIixcImxlZnQ6IDI2cHhcIixcInRvcDogMTZweFwiXS5qb2luKFwiO1wiKTtjbHM/Y29uLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsZWwuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIikpOm51bGw7aWQ/Y29uLnNldEF0dHJpYnV0ZShcImlkXCIsZWwuZ2V0QXR0cmlidXRlKFwiaWRcIikpOm51bGw7Y29uLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjtiYWNrZ3JvdW5kOm5vbmU7Ym9yZGVyOm5vbmU7cGFkZGluZzowO1wiKTtjb24uc2V0QXR0cmlidXRlKFwiYXJpYS1oaWRkZW5cIixcInRydWVcIik7dmFyIHBsYXk9ZC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO3BsYXkuc2V0QXR0cmlidXRlKFwiY2xhc3NcIixcImdpZmZmZXItcGxheS1idXR0b25cIik7cGxheS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLHBsYXlCdXR0b25TdHlsZXMpO3ZhciB0cm5nbD1kLmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7dHJuZ2wuc2V0QXR0cmlidXRlKFwic3R5bGVcIixwbGF5QnV0dG9uSWNvblN0eWxlcyk7cGxheS5hcHBlbmRDaGlsZCh0cm5nbCk7aWYoYWx0VGV4dCl7YWx0PWQuY3JlYXRlRWxlbWVudChcInBcIik7YWx0LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCJnaWZmZmVyLWFsdFwiKTthbHQuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImJvcmRlcjowO2NsaXA6cmVjdCgwIDAgMCAwKTtoZWlnaHQ6MXB4O292ZXJmbG93OmhpZGRlbjtwYWRkaW5nOjA7cG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MXB4O1wiKTthbHQuaW5uZXJUZXh0PWFsdFRleHQrXCIsIGltYWdlXCJ9Y29uLmFwcGVuZENoaWxkKHBsYXkpO2VsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGNvbixlbCk7YWx0VGV4dD9jb24ucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoYWx0LGNvbi5uZXh0U2libGluZyk6bnVsbDtyZXR1cm57Yzpjb24scDpwbGF5fX1mdW5jdGlvbiBjYWxjdWxhdGVQZXJjZW50YWdlRGltKGVsLHcsaCx3T3JpZyxoT3JpZyl7dmFyIHBhcmVudERpbVc9ZWwucGFyZW50Tm9kZS5vZmZzZXRXaWR0aDt2YXIgcGFyZW50RGltSD1lbC5wYXJlbnROb2RlLm9mZnNldEhlaWdodDt2YXIgcmF0aW89d09yaWcvaE9yaWc7aWYody50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe3c9cGFyc2VJbnQody50b1N0cmluZygpLnJlcGxhY2UoXCIlXCIsXCJcIikpO3c9dy8xMDAqcGFyZW50RGltVztoPXcvcmF0aW99ZWxzZSBpZihoLnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7aD1wYXJzZUludChoLnRvU3RyaW5nKCkucmVwbGFjZShcIiVcIixcIlwiKSk7aD1oLzEwMCpwYXJlbnREaW1XO3c9aC9yYXRpb31yZXR1cm57dzp3LGg6aH19ZnVuY3Rpb24gcHJvY2VzcyhlbCxnaWZzLG9wdGlvbnMpe3ZhciB1cmwsY29uLGMsdyxoLGR1cmF0aW9uLHBsYXksZ2lmLHBsYXlpbmc9ZmFsc2UsY2MsaXNDLGR1cmF0aW9uVGltZW91dCxkaW1zLGFsdFRleHQ7dXJsPWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlclwiKTt3PWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci13aWR0aFwiKTtoPWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci1oZWlnaHRcIik7ZHVyYXRpb249ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLWR1cmF0aW9uXCIpO2FsdFRleHQ9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLWFsdFwiKTtlbC5zdHlsZS5kaXNwbGF5PVwiYmxvY2tcIjtjPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7aXNDPSEhKGMuZ2V0Q29udGV4dCYmYy5nZXRDb250ZXh0KFwiMmRcIikpO2lmKHcmJmgmJmlzQyljYz1jcmVhdGVDb250YWluZXIodyxoLGVsLGFsdFRleHQsb3B0aW9ucyk7ZWwub25sb2FkPWZ1bmN0aW9uKCl7aWYoIWlzQylyZXR1cm47dz13fHxlbC53aWR0aDtoPWh8fGVsLmhlaWdodDtpZighY2MpY2M9Y3JlYXRlQ29udGFpbmVyKHcsaCxlbCxhbHRUZXh0LG9wdGlvbnMpO2Nvbj1jYy5jO3BsYXk9Y2MucDtkaW1zPWNhbGN1bGF0ZVBlcmNlbnRhZ2VEaW0oY29uLHcsaCxlbC53aWR0aCxlbC5oZWlnaHQpO2dpZnMucHVzaChjb24pO2Nvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIixmdW5jdGlvbigpe2NsZWFyVGltZW91dChkdXJhdGlvblRpbWVvdXQpO2lmKCFwbGF5aW5nKXtwbGF5aW5nPXRydWU7Z2lmPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJJTUdcIik7Z2lmLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ3aWR0aDoxMDAlO2hlaWdodDoxMDAlO1wiKTtnaWYuc2V0QXR0cmlidXRlKFwiZGF0YS11cmlcIixNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMWU1KSsxKTtzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Z2lmLnNyYz11cmx9LDApO2Nvbi5yZW1vdmVDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoYyk7Y29uLmFwcGVuZENoaWxkKGdpZik7aWYocGFyc2VJbnQoZHVyYXRpb24pPjApe2R1cmF0aW9uVGltZW91dD1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7cGxheWluZz1mYWxzZTtjb24uYXBwZW5kQ2hpbGQocGxheSk7Y29uLnJlbW92ZUNoaWxkKGdpZik7Y29uLmFwcGVuZENoaWxkKGMpO2dpZj1udWxsfSxkdXJhdGlvbil9fWVsc2V7cGxheWluZz1mYWxzZTtjb24uYXBwZW5kQ2hpbGQocGxheSk7Y29uLnJlbW92ZUNoaWxkKGdpZik7Y29uLmFwcGVuZENoaWxkKGMpO2dpZj1udWxsfX0pO2Mud2lkdGg9ZGltcy53O2MuaGVpZ2h0PWRpbXMuaDtjLmdldENvbnRleHQoXCIyZFwiKS5kcmF3SW1hZ2UoZWwsMCwwLGRpbXMudyxkaW1zLmgpO2Nvbi5hcHBlbmRDaGlsZChjKTtjb24uc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInBvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO3dpZHRoOlwiK2RpbXMudytcInB4O2hlaWdodDpcIitkaW1zLmgrXCJweDtiYWNrZ3JvdW5kOm5vbmU7Ym9yZGVyOm5vbmU7cGFkZGluZzowO1wiKTtjLnN0eWxlLndpZHRoPVwiMTAwJVwiO2Muc3R5bGUuaGVpZ2h0PVwiMTAwJVwiO2lmKHcudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wJiZoLnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7Y29uLnN0eWxlLndpZHRoPXc7Y29uLnN0eWxlLmhlaWdodD1ofWVsc2UgaWYody50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2Nvbi5zdHlsZS53aWR0aD13O2Nvbi5zdHlsZS5oZWlnaHQ9XCJpbmhlcml0XCJ9ZWxzZSBpZihoLnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7Y29uLnN0eWxlLndpZHRoPVwiaW5oZXJpdFwiO2Nvbi5zdHlsZS5oZWlnaHQ9aH1lbHNle2Nvbi5zdHlsZS53aWR0aD1kaW1zLncrXCJweFwiO2Nvbi5zdHlsZS5oZWlnaHQ9ZGltcy5oK1wicHhcIn19O2VsLnNyYz11cmx9cmV0dXJuIEdpZmZmZXJ9KTsiLCJcbi8vIEZvbGxvd2luZyBjb2RlIGFkZHMgdHlwZWFoZWFkIGtleXdvcmRzIHRvIHNlYXJjaCBiYXJzXG5cbnZhciBrZXl3b3JkcyA9IG5ldyBCbG9vZGhvdW5kKHtcbiAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXG4gICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgIHByZWZldGNoOiB7XG4gICAgdXJsOiAnL2tleXdvcmRzJyxcbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgIHJldHVybiAkLm1hcChsaXN0LCBmdW5jdGlvbihjaXR5bmFtZSkge1xuICAgICAgICByZXR1cm4geyBuYW1lOiBjaXR5bmFtZSB9OyB9KTtcbiAgICB9XG4gIH1cblxufSk7XG5cbmtleXdvcmRzLmluaXRpYWxpemUoKTtcblxuJCgnI3NlYXJjaCcpLnR5cGVhaGVhZChudWxsLCB7XG4gICAgIG1pbmxlbmd0aDogMSxcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgZGlzcGxheUtleTogJ25hbWUnLFxuICAgICB2YWx1ZUtleTogJ25hbWUnLFxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXG59KTtcblxuJCgnI3NlYXJjaF9wYWdlJykudHlwZWFoZWFkKG51bGwsIHtcbiAgICAgbWlubGVuZ3RoOiAxLFxuICAgICBuYW1lOiAna2V5d29yZHMnLFxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXG4gICAgIHZhbHVlS2V5OiAnbmFtZScsXG4gICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcbn0pO1xuXG5cblxuJCgnI2tleXdvcmRzJykudGFnc2lucHV0KHtcbiAgICBjb25maXJtS2V5czogWzEzLCAzMiwgNDRdLFxuICAgIHR5cGVhaGVhZGpzOiBbe1xuICAgICAgICAgIG1pbkxlbmd0aDogMSxcbiAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG5cbiAgICB9LHtcbiAgICAgICAgbWlubGVuZ3RoOiAxLFxuICAgICAgICBuYW1lOiAna2V5d29yZHMnLFxuICAgICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXG4gICAgICAgIHZhbHVlS2V5OiAnbmFtZScsXG4gICAgICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcbiAgICB9XSxcbiAgICBmcmVlSW5wdXQ6IHRydWUsXG5cbn0pO1xuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gIEdpZmZmZXIoe1xuICAgICAgcGxheUJ1dHRvblN0eWxlczoge1xuICAgICAgICAnd2lkdGgnOiAnNjBweCcsXG4gICAgICAgICdoZWlnaHQnOiAnNjBweCcsXG4gICAgICAgICdib3JkZXItcmFkaXVzJzogJzMwcHgnLFxuICAgICAgICAnYmFja2dyb3VuZCc6ICdyZ2JhKDAsIDAsIDAsIDAuMyknLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAndG9wJzogJzUwJScsXG4gICAgICAgICdsZWZ0JzogJzUwJScsXG4gICAgICAgICdtYXJnaW4nOiAnLTMwcHggMCAwIC0zMHB4J1xuICAgICAgfSxcbiAgICAgIHBsYXlCdXR0b25JY29uU3R5bGVzOiB7XG4gICAgICAgICd3aWR0aCc6ICcwJyxcbiAgICAgICAgJ2hlaWdodCc6ICcwJyxcbiAgICAgICAgJ2JvcmRlci10b3AnOiAnMTRweCBzb2xpZCB0cmFuc3BhcmVudCcsXG4gICAgICAgICdib3JkZXItYm90dG9tJzogJzE0cHggc29saWQgdHJhbnNwYXJlbnQnLFxuICAgICAgICAnYm9yZGVyLWxlZnQnOiAnMTRweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LCAwLjUpJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ2xlZnQnOiAnMjZweCcsXG4gICAgICAgICd0b3AnOiAnMTZweCdcbiAgICAgIH1cbiAgICB9KTtcbn0iLCJcbmZ1bmN0aW9uIHN0YXJGdW5jdGlvbih4LCB5KSB7XG5cbiAgICBhcGlfdXJsID0gJy9hcGkvdjEvc3Rhci8nICsgeSArICcvJztcblxuICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwiZmEtc3Rhci1vXCIpKXtcbiAgICAgICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibm90LWxvZ2dlZC1pblwiKSl7XG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XG4gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xuICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuZmFkZUluKCk7XG4vLyAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlT3V0KCk7XG4gICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyLW9cIilcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LmFkZChcImZhLXN0YXJcIilcbiAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsICAgIC8vWW91ciBhcGkgdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnUFVUJywgICAvL3R5cGUgaXMgYW55IEhUVFAgbWV0aG9kXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sICAgICAgLy9EYXRhIGFzIGpzIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJmYS1zdGFyXCIpKXtcblxuICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyXCIpXG4gICAgICAgIHguY2xhc3NMaXN0LmFkZChcImZhLXN0YXItb1wiKVxuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgO1xuICAgIH1cblxufVxuXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG4gICQodGhpcykuY2xvc2VzdCgnLmNhcmQnKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlSW4oKTtcbn0pIiwiKGZ1bmN0aW9uKCQpe1widXNlIHN0cmljdFwiO3ZhciBNYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24oZWxlbWVudCxvcHRpb25zKXt2YXIgbXM9dGhpczt2YXIgZGVmYXVsdHM9e2FsbG93RnJlZUVudHJpZXM6dHJ1ZSxhbGxvd0R1cGxpY2F0ZXM6ZmFsc2UsYWpheENvbmZpZzp7fSxhdXRvU2VsZWN0OnRydWUsc2VsZWN0Rmlyc3Q6ZmFsc2UscXVlcnlQYXJhbTpcInF1ZXJ5XCIsYmVmb3JlU2VuZDpmdW5jdGlvbigpe30sY2xzOlwiXCIsZGF0YTpudWxsLGRhdGFVcmxQYXJhbXM6e30sZGlzYWJsZWQ6ZmFsc2UsZGlzYWJsZWRGaWVsZDpudWxsLGRpc3BsYXlGaWVsZDpcIm5hbWVcIixlZGl0YWJsZTp0cnVlLGV4cGFuZGVkOmZhbHNlLGV4cGFuZE9uRm9jdXM6ZmFsc2UsZ3JvdXBCeTpudWxsLGhpZGVUcmlnZ2VyOmZhbHNlLGhpZ2hsaWdodDp0cnVlLGlkOm51bGwsaW5mb01zZ0NsczpcIlwiLGlucHV0Q2ZnOnt9LGludmFsaWRDbHM6XCJtcy1pbnZcIixtYXRjaENhc2U6ZmFsc2UsbWF4RHJvcEhlaWdodDoyOTAsbWF4RW50cnlMZW5ndGg6bnVsbCxtYXhFbnRyeVJlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiUGxlYXNlIHJlZHVjZSB5b3VyIGVudHJ5IGJ5IFwiK3YrXCIgY2hhcmFjdGVyXCIrKHY+MT9cInNcIjpcIlwiKX0sbWF4U3VnZ2VzdGlvbnM6bnVsbCxtYXhTZWxlY3Rpb246MTAsbWF4U2VsZWN0aW9uUmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gXCIrditcIiBpdGVtXCIrKHY+MT9cInNcIjpcIlwiKX0sbWV0aG9kOlwiUE9TVFwiLG1pbkNoYXJzOjAsbWluQ2hhcnNSZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIlBsZWFzZSB0eXBlIFwiK3YrXCIgbW9yZSBjaGFyYWN0ZXJcIisodj4xP1wic1wiOlwiXCIpfSxtb2RlOlwibG9jYWxcIixuYW1lOm51bGwsbm9TdWdnZXN0aW9uVGV4dDpcIk5vIHN1Z2dlc3Rpb25zXCIscGxhY2Vob2xkZXI6XCJUeXBlIG9yIGNsaWNrIGhlcmVcIixyZW5kZXJlcjpudWxsLHJlcXVpcmVkOmZhbHNlLHJlc3VsdEFzU3RyaW5nOmZhbHNlLHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOlwiLFwiLHJlc3VsdHNGaWVsZDpcInJlc3VsdHNcIixzZWxlY3Rpb25DbHM6XCJcIixzZWxlY3Rpb25Db250YWluZXI6bnVsbCxzZWxlY3Rpb25Qb3NpdGlvbjpcImlubmVyXCIsc2VsZWN0aW9uUmVuZGVyZXI6bnVsbCxzZWxlY3Rpb25TdGFja2VkOmZhbHNlLHNvcnREaXI6XCJhc2NcIixzb3J0T3JkZXI6bnVsbCxzdHJpY3RTdWdnZXN0OmZhbHNlLHN0eWxlOlwiXCIsdG9nZ2xlT25DbGljazpmYWxzZSx0eXBlRGVsYXk6NDAwLHVzZVRhYktleTpmYWxzZSx1c2VDb21tYUtleTp0cnVlLHVzZVplYnJhU3R5bGU6ZmFsc2UsdmFsdWU6bnVsbCx2YWx1ZUZpZWxkOlwiaWRcIix2cmVnZXg6bnVsbCx2dHlwZTpudWxsfTt2YXIgY29uZj0kLmV4dGVuZCh7fSxvcHRpb25zKTt2YXIgY2ZnPSQuZXh0ZW5kKHRydWUse30sZGVmYXVsdHMsY29uZik7dGhpcy5hZGRUb1NlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyxpc1NpbGVudCl7aWYoIWNmZy5tYXhTZWxlY3Rpb258fF9zZWxlY3Rpb24ubGVuZ3RoPGNmZy5tYXhTZWxlY3Rpb24pe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe2lmKGNmZy5hbGxvd0R1cGxpY2F0ZXN8fCQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKT09PS0xKXtfc2VsZWN0aW9uLnB1c2goanNvbik7dmFsdWVjaGFuZ2VkPXRydWV9fSk7aWYodmFsdWVjaGFuZ2VkPT09dHJ1ZSl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7dGhpcy5lbXB0eSgpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfX19dGhpcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJnRoaXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcil9O3RoaXMuY2xlYXI9ZnVuY3Rpb24oaXNTaWxlbnQpe3RoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbihfc2VsZWN0aW9uLnNsaWNlKDApLGlzU2lsZW50KX07dGhpcy5jb2xsYXBzZT1mdW5jdGlvbigpe2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3RoaXMuY29tYm9ib3guZGV0YWNoKCk7Y2ZnLmV4cGFuZGVkPWZhbHNlOyQodGhpcykudHJpZ2dlcihcImNvbGxhcHNlXCIsW3RoaXNdKX19O3RoaXMuZGlzYWJsZT1mdW5jdGlvbigpe3RoaXMuY29udGFpbmVyLmFkZENsYXNzKFwibXMtY3RuLWRpc2FibGVkXCIpO2NmZy5kaXNhYmxlZD10cnVlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLHRydWUpfTt0aGlzLmVtcHR5PWZ1bmN0aW9uKCl7dGhpcy5pbnB1dC52YWwoXCJcIil9O3RoaXMuZW5hYmxlPWZ1bmN0aW9uKCl7dGhpcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZGlzYWJsZWRcIik7Y2ZnLmRpc2FibGVkPWZhbHNlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLGZhbHNlKX07dGhpcy5leHBhbmQ9ZnVuY3Rpb24oKXtpZighY2ZnLmV4cGFuZGVkJiYodGhpcy5pbnB1dC52YWwoKS5sZW5ndGg+PWNmZy5taW5DaGFyc3x8dGhpcy5jb21ib2JveC5jaGlsZHJlbigpLnNpemUoKT4wKSl7dGhpcy5jb21ib2JveC5hcHBlbmRUbyh0aGlzLmNvbnRhaW5lcik7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7Y2ZnLmV4cGFuZGVkPXRydWU7JCh0aGlzKS50cmlnZ2VyKFwiZXhwYW5kXCIsW3RoaXNdKX19O3RoaXMuaXNEaXNhYmxlZD1mdW5jdGlvbigpe3JldHVybiBjZmcuZGlzYWJsZWR9O3RoaXMuaXNWYWxpZD1mdW5jdGlvbigpe3ZhciB2YWxpZD1jZmcucmVxdWlyZWQ9PT1mYWxzZXx8X3NlbGVjdGlvbi5sZW5ndGg+MDtpZihjZmcudnR5cGV8fGNmZy52cmVnZXgpeyQuZWFjaChfc2VsZWN0aW9uLGZ1bmN0aW9uKGluZGV4LGl0ZW0pe3ZhbGlkPXZhbGlkJiZzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0oaXRlbVtjZmcudmFsdWVGaWVsZF0pfSl9cmV0dXJuIHZhbGlkfTt0aGlzLmdldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXN9O3RoaXMuZ2V0TmFtZT1mdW5jdGlvbigpe3JldHVybiBjZmcubmFtZX07dGhpcy5nZXRTZWxlY3Rpb249ZnVuY3Rpb24oKXtyZXR1cm4gX3NlbGVjdGlvbn07dGhpcy5nZXRSYXdWYWx1ZT1mdW5jdGlvbigpe3JldHVybiBtcy5pbnB1dC52YWwoKX07dGhpcy5nZXRWYWx1ZT1mdW5jdGlvbigpe3JldHVybiAkLm1hcChfc2VsZWN0aW9uLGZ1bmN0aW9uKG8pe3JldHVybiBvW2NmZy52YWx1ZUZpZWxkXX0pfTt0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMsaXNTaWxlbnQpe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe3ZhciBpPSQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKTtpZihpPi0xKXtfc2VsZWN0aW9uLnNwbGljZShpLDEpO3ZhbHVlY2hhbmdlZD10cnVlfX0pO2lmKHZhbHVlY2hhbmdlZD09PXRydWUpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfWlmKGNmZy5leHBhbmRPbkZvY3VzKXttcy5leHBhbmQoKX1pZihjZmcuZXhwYW5kZWQpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfX10aGlzLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKX07dGhpcy5nZXREYXRhPWZ1bmN0aW9uKCl7cmV0dXJuIF9jYkRhdGF9O3RoaXMuc2V0RGF0YT1mdW5jdGlvbihkYXRhKXtjZmcuZGF0YT1kYXRhO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfTt0aGlzLnNldE5hbWU9ZnVuY3Rpb24obmFtZSl7Y2ZnLm5hbWU9bmFtZTtpZihuYW1lKXtjZmcubmFtZSs9bmFtZS5pbmRleE9mKFwiW11cIik+MD9cIlwiOlwiW11cIn1pZihtcy5fdmFsdWVDb250YWluZXIpeyQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSxmdW5jdGlvbihpLGVsKXtlbC5uYW1lPWNmZy5uYW1lfSl9fTt0aGlzLnNldFNlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyl7dGhpcy5jbGVhcigpO3RoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpfTt0aGlzLnNldFZhbHVlPWZ1bmN0aW9uKHZhbHVlcyl7dmFyIGl0ZW1zPVtdOyQuZWFjaCh2YWx1ZXMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBmb3VuZD1mYWxzZTskLmVhY2goX2NiRGF0YSxmdW5jdGlvbihpLGl0ZW0pe2lmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdPT12YWx1ZSl7aXRlbXMucHVzaChpdGVtKTtmb3VuZD10cnVlO3JldHVybiBmYWxzZX19KTtpZighZm91bmQpe2lmKHR5cGVvZiB2YWx1ZT09PVwib2JqZWN0XCIpe2l0ZW1zLnB1c2godmFsdWUpfWVsc2V7dmFyIGpzb249e307anNvbltjZmcudmFsdWVGaWVsZF09dmFsdWU7anNvbltjZmcuZGlzcGxheUZpZWxkXT12YWx1ZTtpdGVtcy5wdXNoKGpzb24pfX19KTtpZihpdGVtcy5sZW5ndGg+MCl7dGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyl9fTt0aGlzLnNldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24ocGFyYW1zKXtjZmcuZGF0YVVybFBhcmFtcz0kLmV4dGVuZCh7fSxwYXJhbXMpfTt2YXIgX3NlbGVjdGlvbj1bXSxfY29tYm9JdGVtSGVpZ2h0PTAsX3RpbWVyLF9oYXNGb2N1cz1mYWxzZSxfZ3JvdXBzPW51bGwsX2NiRGF0YT1bXSxfY3RybERvd249ZmFsc2UsS0VZQ09ERVM9e0JBQ0tTUEFDRTo4LFRBQjo5LEVOVEVSOjEzLENUUkw6MTcsRVNDOjI3LFNQQUNFOjMyLFVQQVJST1c6MzgsRE9XTkFSUk9XOjQwLENPTU1BOjE4OH07dmFyIHNlbGY9e19kaXNwbGF5U3VnZ2VzdGlvbnM6ZnVuY3Rpb24oZGF0YSl7bXMuY29tYm9ib3guc2hvdygpO21zLmNvbWJvYm94LmVtcHR5KCk7dmFyIHJlc0hlaWdodD0wLG5iR3JvdXBzPTA7aWYoX2dyb3Vwcz09PW51bGwpe3NlbGYuX3JlbmRlckNvbWJvSXRlbXMoZGF0YSk7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqZGF0YS5sZW5ndGh9ZWxzZXtmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcyl7bmJHcm91cHMrPTE7JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtZ3JvdXBcIixodG1sOmdycE5hbWV9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7c2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhfZ3JvdXBzW2dycE5hbWVdLml0ZW1zLHRydWUpfXZhciBfZ3JvdXBJdGVtSGVpZ2h0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWdyb3VwXCIpLm91dGVySGVpZ2h0KCk7aWYoX2dyb3VwSXRlbUhlaWdodCE9PW51bGwpe3ZhciB0bXBSZXNIZWlnaHQ9bmJHcm91cHMqX2dyb3VwSXRlbUhlaWdodDtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCpkYXRhLmxlbmd0aCt0bXBSZXNIZWlnaHR9ZWxzZXtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCooZGF0YS5sZW5ndGgrbmJHcm91cHMpfX1pZihyZXNIZWlnaHQ8bXMuY29tYm9ib3guaGVpZ2h0KCl8fHJlc0hlaWdodDw9Y2ZnLm1heERyb3BIZWlnaHQpe21zLmNvbWJvYm94LmhlaWdodChyZXNIZWlnaHQpfWVsc2UgaWYocmVzSGVpZ2h0Pj1tcy5jb21ib2JveC5oZWlnaHQoKSYmcmVzSGVpZ2h0PmNmZy5tYXhEcm9wSGVpZ2h0KXttcy5jb21ib2JveC5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpfWlmKGRhdGEubGVuZ3RoPT09MSYmY2ZnLmF1dG9TZWxlY3Q9PT10cnVlKXttcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcihcIjpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGNmZy5zZWxlY3RGaXJzdD09PXRydWUpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKFwiOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGRhdGEubGVuZ3RoPT09MCYmbXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCIpe3ZhciBub1N1Z2dlc3Rpb25UZXh0PWNmZy5ub1N1Z2dlc3Rpb25UZXh0LnJlcGxhY2UoL1xce1xcey4qXFx9XFx9Lyxtcy5pbnB1dC52YWwoKSk7c2VsZi5fdXBkYXRlSGVscGVyKG5vU3VnZ2VzdGlvblRleHQpO21zLmNvbGxhcHNlKCl9aWYoY2ZnLmFsbG93RnJlZUVudHJpZXM9PT1mYWxzZSl7aWYoZGF0YS5sZW5ndGg9PT0wKXskKG1zLmlucHV0KS5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7bXMuY29tYm9ib3guaGlkZSgpfWVsc2V7JChtcy5pbnB1dCkucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpfX19LF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OmZ1bmN0aW9uKGRhdGEpe3ZhciBqc29uPVtdOyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LHMpe3ZhciBlbnRyeT17fTtlbnRyeVtjZmcuZGlzcGxheUZpZWxkXT1lbnRyeVtjZmcudmFsdWVGaWVsZF09JC50cmltKHMpO2pzb24ucHVzaChlbnRyeSl9KTtyZXR1cm4ganNvbn0sX2hpZ2hsaWdodFN1Z2dlc3Rpb246ZnVuY3Rpb24oaHRtbCl7dmFyIHE9bXMuaW5wdXQudmFsKCk7dmFyIHNwZWNpYWxDaGFyYWN0ZXJzPVtcIl5cIixcIiRcIixcIipcIixcIitcIixcIj9cIixcIi5cIixcIihcIixcIilcIixcIjpcIixcIiFcIixcInxcIixcIntcIixcIn1cIixcIltcIixcIl1cIl07JC5lYWNoKHNwZWNpYWxDaGFyYWN0ZXJzLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXtxPXEucmVwbGFjZSh2YWx1ZSxcIlxcXFxcIit2YWx1ZSl9KTtpZihxLmxlbmd0aD09PTApe3JldHVybiBodG1sfXZhciBnbG9iPWNmZy5tYXRjaENhc2U9PT10cnVlP1wiZ1wiOlwiZ2lcIjtyZXR1cm4gaHRtbC5yZXBsYWNlKG5ldyBSZWdFeHAoXCIoXCIrcStcIikoPyEoW148XSspPz4pXCIsZ2xvYiksXCI8ZW0+JDE8L2VtPlwiKX0sX21vdmVTZWxlY3RlZFJvdzpmdW5jdGlvbihkaXIpe2lmKCFjZmcuZXhwYW5kZWQpe21zLmV4cGFuZCgpfXZhciBsaXN0LHN0YXJ0LGFjdGl2ZSxzY3JvbGxQb3M7bGlzdD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpO2lmKGRpcj09PVwiZG93blwiKXtzdGFydD1saXN0LmVxKDApfWVsc2V7c3RhcnQ9bGlzdC5maWx0ZXIoXCI6bGFzdFwiKX1hY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIik7aWYoYWN0aXZlLmxlbmd0aD4wKXtpZihkaXI9PT1cImRvd25cIil7c3RhcnQ9YWN0aXZlLm5leHRBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmVxKDApfXNjcm9sbFBvcz1tcy5jb21ib2JveC5zY3JvbGxUb3AoKTttcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7aWYoc3RhcnRbMF0ub2Zmc2V0VG9wK3N0YXJ0Lm91dGVySGVpZ2h0KCk+bXMuY29tYm9ib3guaGVpZ2h0KCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChzY3JvbGxQb3MrX2NvbWJvSXRlbUhlaWdodCl9fWVsc2V7c3RhcnQ9YWN0aXZlLnByZXZBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmZpbHRlcihcIjpsYXN0XCIpO21zLmNvbWJvYm94LnNjcm9sbFRvcChfY29tYm9JdGVtSGVpZ2h0Kmxpc3QubGVuZ3RoKX1pZihzdGFydFswXS5vZmZzZXRUb3A8bXMuY29tYm9ib3guc2Nyb2xsVG9wKCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChtcy5jb21ib2JveC5zY3JvbGxUb3AoKS1fY29tYm9JdGVtSGVpZ2h0KX19fWxpc3QucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7c3RhcnQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9LF9wcm9jZXNzU3VnZ2VzdGlvbnM6ZnVuY3Rpb24oc291cmNlKXt2YXIganNvbj1udWxsLGRhdGE9c291cmNlfHxjZmcuZGF0YTtpZihkYXRhIT09bnVsbCl7aWYodHlwZW9mIGRhdGE9PT1cImZ1bmN0aW9uXCIpe2RhdGE9ZGF0YS5jYWxsKG1zLG1zLmdldFJhd1ZhbHVlKCkpfWlmKHR5cGVvZiBkYXRhPT09XCJzdHJpbmdcIil7JChtcykudHJpZ2dlcihcImJlZm9yZWxvYWRcIixbbXNdKTt2YXIgcXVlcnlQYXJhbXM9e307cXVlcnlQYXJhbXNbY2ZnLnF1ZXJ5UGFyYW1dPW1zLmlucHV0LnZhbCgpO3ZhciBwYXJhbXM9JC5leHRlbmQocXVlcnlQYXJhbXMsY2ZnLmRhdGFVcmxQYXJhbXMpOyQuYWpheCgkLmV4dGVuZCh7dHlwZTpjZmcubWV0aG9kLHVybDpkYXRhLGRhdGE6cGFyYW1zLGJlZm9yZVNlbmQ6Y2ZnLmJlZm9yZVNlbmQsc3VjY2VzczpmdW5jdGlvbihhc3luY0RhdGEpe2pzb249dHlwZW9mIGFzeW5jRGF0YT09PVwic3RyaW5nXCI/SlNPTi5wYXJzZShhc3luY0RhdGEpOmFzeW5jRGF0YTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoanNvbik7JChtcykudHJpZ2dlcihcImxvYWRcIixbbXMsanNvbl0pO2lmKHNlbGYuX2FzeW5jVmFsdWVzKXttcy5zZXRWYWx1ZSh0eXBlb2Ygc2VsZi5fYXN5bmNWYWx1ZXM9PT1cInN0cmluZ1wiP0pTT04ucGFyc2Uoc2VsZi5fYXN5bmNWYWx1ZXMpOnNlbGYuX2FzeW5jVmFsdWVzKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtkZWxldGUgc2VsZi5fYXN5bmNWYWx1ZXN9fSxlcnJvcjpmdW5jdGlvbigpe3Rocm93XCJDb3VsZCBub3QgcmVhY2ggc2VydmVyXCJ9fSxjZmcuYWpheENvbmZpZykpO3JldHVybn1lbHNle2lmKGRhdGEubGVuZ3RoPjAmJnR5cGVvZiBkYXRhWzBdPT09XCJzdHJpbmdcIil7X2NiRGF0YT1zZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpfWVsc2V7X2NiRGF0YT1kYXRhW2NmZy5yZXN1bHRzRmllbGRdfHxkYXRhfX12YXIgc29ydGVkRGF0YT1jZmcubW9kZT09PVwicmVtb3RlXCI/X2NiRGF0YTpzZWxmLl9zb3J0QW5kVHJpbShfY2JEYXRhKTtzZWxmLl9kaXNwbGF5U3VnZ2VzdGlvbnMoc2VsZi5fZ3JvdXAoc29ydGVkRGF0YSkpfX0sX3JlbmRlcjpmdW5jdGlvbihlbCl7bXMuc2V0TmFtZShjZmcubmFtZSk7bXMuY29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtY3RuIGZvcm0tY29udHJvbCBcIisoY2ZnLnJlc3VsdEFzU3RyaW5nP1wibXMtYXMtc3RyaW5nIFwiOlwiXCIpK2NmZy5jbHMrKCQoZWwpLmhhc0NsYXNzKFwiaW5wdXQtbGdcIik/XCIgaW5wdXQtbGdcIjpcIlwiKSsoJChlbCkuaGFzQ2xhc3MoXCJpbnB1dC1zbVwiKT9cIiBpbnB1dC1zbVwiOlwiXCIpKyhjZmcuZGlzYWJsZWQ9PT10cnVlP1wiIG1zLWN0bi1kaXNhYmxlZFwiOlwiXCIpKyhjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtY3RuLXJlYWRvbmx5XCIpKyhjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZT9cIlwiOlwiIG1zLW5vLXRyaWdnZXJcIiksc3R5bGU6Y2ZnLnN0eWxlLGlkOmNmZy5pZH0pO21zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLHRoaXMpKTttcy5jb250YWluZXIuYmx1cigkLnByb3h5KGhhbmRsZXJzLl9vbkJsdXIsdGhpcykpO21zLmNvbnRhaW5lci5rZXlkb3duKCQucHJveHkoaGFuZGxlcnMuX29uS2V5RG93bix0aGlzKSk7bXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsdGhpcykpO21zLmlucHV0PSQoXCI8aW5wdXQvPlwiLCQuZXh0ZW5kKHt0eXBlOlwidGV4dFwiLFwiY2xhc3NcIjpjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtaW5wdXQtcmVhZG9ubHlcIixyZWFkb25seTohY2ZnLmVkaXRhYmxlLHBsYWNlaG9sZGVyOmNmZy5wbGFjZWhvbGRlcixkaXNhYmxlZDpjZmcuZGlzYWJsZWR9LGNmZy5pbnB1dENmZykpO21zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cyx0aGlzKSk7bXMuaW5wdXQuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25JbnB1dENsaWNrLHRoaXMpKTttcy5jb21ib2JveD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1jdG4gZHJvcGRvd24tbWVudVwifSkuaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTttcy5jb21ib2JveC5vbihcImNsaWNrXCIsXCJkaXYubXMtcmVzLWl0ZW1cIiwkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbVNlbGVjdGVkLHRoaXMpKTttcy5jb21ib2JveC5vbihcIm1vdXNlb3ZlclwiLFwiZGl2Lm1zLXJlcy1pdGVtXCIsJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1Nb3VzZU92ZXIsdGhpcykpO2lmKGNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLnNlbGVjdGlvbkNvbnRhaW5lcj1jZmcuc2VsZWN0aW9uQ29udGFpbmVyOyQobXMuc2VsZWN0aW9uQ29udGFpbmVyKS5hZGRDbGFzcyhcIm1zLXNlbC1jdG5cIil9ZWxzZXttcy5zZWxlY3Rpb25Db250YWluZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtY3RuXCJ9KX1tcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cyx0aGlzKSk7aWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiYhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCl9ZWxzZXttcy5jb250YWluZXIuYXBwZW5kKG1zLmlucHV0KX1tcy5oZWxwZXI9JChcIjxzcGFuLz5cIix7XCJjbGFzc1wiOlwibXMtaGVscGVyIFwiK2NmZy5pbmZvTXNnQ2xzfSk7c2VsZi5fdXBkYXRlSGVscGVyKCk7bXMuY29udGFpbmVyLmFwcGVuZChtcy5oZWxwZXIpOyQoZWwpLnJlcGxhY2VXaXRoKG1zLmNvbnRhaW5lcik7aWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe3N3aXRjaChjZmcuc2VsZWN0aW9uUG9zaXRpb24pe2Nhc2VcImJvdHRvbVwiOm1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25TdGFja2VkPT09dHJ1ZSl7bXMuc2VsZWN0aW9uQ29udGFpbmVyLndpZHRoKG1zLmNvbnRhaW5lci53aWR0aCgpKTttcy5zZWxlY3Rpb25Db250YWluZXIuYWRkQ2xhc3MoXCJtcy1zdGFja2VkXCIpfWJyZWFrO2Nhc2VcInJpZ2h0XCI6bXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7bXMuY29udGFpbmVyLmNzcyhcImZsb2F0XCIsXCJsZWZ0XCIpO2JyZWFrO2RlZmF1bHQ6bXMuY29udGFpbmVyLmFwcGVuZChtcy5zZWxlY3Rpb25Db250YWluZXIpO2JyZWFrfX1pZihjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZSl7bXMudHJpZ2dlcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXRyaWdnZXJcIixodG1sOic8ZGl2IGNsYXNzPVwibXMtdHJpZ2dlci1pY29cIj48L2Rpdj4nfSk7bXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljayx0aGlzKSk7bXMuY29udGFpbmVyLmFwcGVuZChtcy50cmlnZ2VyKX0kKHdpbmRvdykucmVzaXplKCQucHJveHkoaGFuZGxlcnMuX29uV2luZG93UmVzaXplZCx0aGlzKSk7aWYoY2ZnLnZhbHVlIT09bnVsbHx8Y2ZnLmRhdGEhPT1udWxsKXtpZih0eXBlb2YgY2ZnLmRhdGE9PT1cInN0cmluZ1wiKXtzZWxmLl9hc3luY1ZhbHVlcz1jZmcudmFsdWU7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihjZmcudmFsdWUhPT1udWxsKXttcy5zZXRWYWx1ZShjZmcudmFsdWUpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpfX19JChcImJvZHlcIikuY2xpY2soZnVuY3Rpb24oZSl7aWYobXMuY29udGFpbmVyLmhhc0NsYXNzKFwibXMtY3RuLWZvY3VzXCIpJiZtcy5jb250YWluZXIuaGFzKGUudGFyZ2V0KS5sZW5ndGg9PT0wJiZlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZihcIm1zLXJlcy1pdGVtXCIpPDAmJmUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKFwibXMtY2xvc2UtYnRuXCIpPDAmJm1zLmNvbnRhaW5lclswXSE9PWUudGFyZ2V0KXtoYW5kbGVycy5fb25CbHVyKCl9fSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7Y2ZnLmV4cGFuZGVkPWZhbHNlO21zLmV4cGFuZCgpfX0sX3JlbmRlckNvbWJvSXRlbXM6ZnVuY3Rpb24oaXRlbXMsaXNHcm91cGVkKXt2YXIgcmVmPXRoaXMsaHRtbD1cIlwiOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIGRpc3BsYXllZD1jZmcucmVuZGVyZXIhPT1udWxsP2NmZy5yZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIGRpc2FibGVkPWNmZy5kaXNhYmxlZEZpZWxkIT09bnVsbCYmdmFsdWVbY2ZnLmRpc2FibGVkRmllbGRdPT09dHJ1ZTt2YXIgcmVzdWx0SXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWl0ZW0gXCIrKGlzR3JvdXBlZD9cIm1zLXJlcy1pdGVtLWdyb3VwZWQgXCI6XCJcIikrKGRpc2FibGVkP1wibXMtcmVzLWl0ZW0tZGlzYWJsZWQgXCI6XCJcIikrKGluZGV4JTI9PT0xJiZjZmcudXNlWmVicmFTdHlsZT09PXRydWU/XCJtcy1yZXMtb2RkXCI6XCJcIiksaHRtbDpjZmcuaGlnaGxpZ2h0PT09dHJ1ZT9zZWxmLl9oaWdobGlnaHRTdWdnZXN0aW9uKGRpc3BsYXllZCk6ZGlzcGxheWVkLFwiZGF0YS1qc29uXCI6SlNPTi5zdHJpbmdpZnkodmFsdWUpfSk7aHRtbCs9JChcIjxkaXYvPlwiKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCl9KTttcy5jb21ib2JveC5hcHBlbmQoaHRtbCk7X2NvbWJvSXRlbUhlaWdodD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOmZpcnN0XCIpLm91dGVySGVpZ2h0KCl9LF9yZW5kZXJTZWxlY3Rpb246ZnVuY3Rpb24oKXt2YXIgcmVmPXRoaXMsdz0wLGlucHV0T2Zmc2V0PTAsaXRlbXM9W10sYXNUZXh0PWNmZy5yZXN1bHRBc1N0cmluZz09PXRydWUmJiFfaGFzRm9jdXM7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmZpbmQoXCIubXMtc2VsLWl0ZW1cIikucmVtb3ZlKCk7aWYobXMuX3ZhbHVlQ29udGFpbmVyIT09dW5kZWZpbmVkKXttcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCl9JC5lYWNoKF9zZWxlY3Rpb24sZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBzZWxlY3RlZEl0ZW1FbCxkZWxJdGVtRWwsc2VsZWN0ZWRJdGVtSHRtbD1jZmcuc2VsZWN0aW9uUmVuZGVyZXIhPT1udWxsP2NmZy5zZWxlY3Rpb25SZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIHZhbGlkQ2xzPXNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbSh2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXSk/XCJcIjpcIiBtcy1zZWwtaW52YWxpZFwiO2lmKGFzVGV4dD09PXRydWUpe3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gbXMtc2VsLXRleHQgXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWwrKGluZGV4PT09X3NlbGVjdGlvbi5sZW5ndGgtMT9cIlwiOmNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcil9KS5kYXRhKFwianNvblwiLHZhbHVlKX1lbHNle3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWx9KS5kYXRhKFwianNvblwiLHZhbHVlKTtpZihjZmcuZGlzYWJsZWQ9PT1mYWxzZSl7ZGVsSXRlbUVsPSQoXCI8c3Bhbi8+XCIse1wiY2xhc3NcIjpcIm1zLWNsb3NlLWJ0blwifSkuZGF0YShcImpzb25cIix2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO2RlbEl0ZW1FbC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRhZ1RyaWdnZXJDbGljayxyZWYpKX19aXRlbXMucHVzaChzZWxlY3RlZEl0ZW1FbCl9KTttcy5zZWxlY3Rpb25Db250YWluZXIucHJlcGVuZChpdGVtcyk7bXMuX3ZhbHVlQ29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7c3R5bGU6XCJkaXNwbGF5OiBub25lO1wifSk7JC5lYWNoKG1zLmdldFZhbHVlKCksZnVuY3Rpb24oaSx2YWwpe3ZhciBlbD0kKFwiPGlucHV0Lz5cIix7dHlwZTpcImhpZGRlblwiLG5hbWU6Y2ZnLm5hbWUsdmFsdWU6dmFsfSk7ZWwuYXBwZW5kVG8obXMuX3ZhbHVlQ29udGFpbmVyKX0pO21zLl92YWx1ZUNvbnRhaW5lci5hcHBlbmRUbyhtcy5zZWxlY3Rpb25Db250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLmlucHV0LndpZHRoKDApO2lucHV0T2Zmc2V0PW1zLmlucHV0Lm9mZnNldCgpLmxlZnQtbXMuc2VsZWN0aW9uQ29udGFpbmVyLm9mZnNldCgpLmxlZnQ7dz1tcy5jb250YWluZXIud2lkdGgoKS1pbnB1dE9mZnNldC00Mjttcy5pbnB1dC53aWR0aCh3KX1pZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXttcy5oZWxwZXIuaGlkZSgpfX0sX3NlbGVjdEl0ZW06ZnVuY3Rpb24oaXRlbSl7aWYoY2ZnLm1heFNlbGVjdGlvbj09PTEpe19zZWxlY3Rpb249W119bXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKFwianNvblwiKSk7aXRlbS5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtpZihjZmcuZXhwYW5kT25Gb2N1cz09PWZhbHNlfHxfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe21zLmNvbGxhcHNlKCl9aWYoIV9oYXNGb2N1cyl7bXMuaW5wdXQuZm9jdXMoKX1lbHNlIGlmKF9oYXNGb2N1cyYmKGNmZy5leHBhbmRPbkZvY3VzfHxfY3RybERvd24pKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihfY3RybERvd24pe21zLmV4cGFuZCgpfX19LF9zb3J0QW5kVHJpbTpmdW5jdGlvbihkYXRhKXt2YXIgcT1tcy5nZXRSYXdWYWx1ZSgpLGZpbHRlcmVkPVtdLG5ld1N1Z2dlc3Rpb25zPVtdLHNlbGVjdGVkVmFsdWVzPW1zLmdldFZhbHVlKCk7aWYocS5sZW5ndGg+MCl7JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgsb2JqKXt2YXIgbmFtZT1vYmpbY2ZnLmRpc3BsYXlGaWVsZF07aWYoY2ZnLm1hdGNoQ2FzZT09PXRydWUmJm5hbWUuaW5kZXhPZihxKT4tMXx8Y2ZnLm1hdGNoQ2FzZT09PWZhbHNlJiZuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPi0xKXtpZihjZmcuc3RyaWN0U3VnZ2VzdD09PWZhbHNlfHxuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPT09MCl7ZmlsdGVyZWQucHVzaChvYmopfX19KX1lbHNle2ZpbHRlcmVkPWRhdGF9JC5lYWNoKGZpbHRlcmVkLGZ1bmN0aW9uKGluZGV4LG9iail7aWYoY2ZnLmFsbG93RHVwbGljYXRlc3x8JC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sc2VsZWN0ZWRWYWx1ZXMpPT09LTEpe25ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKX19KTtpZihjZmcuc29ydE9yZGVyIT09bnVsbCl7bmV3U3VnZ2VzdGlvbnMuc29ydChmdW5jdGlvbihhLGIpe2lmKGFbY2ZnLnNvcnRPcmRlcl08YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8tMToxfWlmKGFbY2ZnLnNvcnRPcmRlcl0+YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8xOi0xfXJldHVybiAwfSl9aWYoY2ZnLm1heFN1Z2dlc3Rpb25zJiZjZmcubWF4U3VnZ2VzdGlvbnM+MCl7bmV3U3VnZ2VzdGlvbnM9bmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCxjZmcubWF4U3VnZ2VzdGlvbnMpfXJldHVybiBuZXdTdWdnZXN0aW9uc30sX2dyb3VwOmZ1bmN0aW9uKGRhdGEpe2lmKGNmZy5ncm91cEJ5IT09bnVsbCl7X2dyb3Vwcz17fTskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIHByb3BzPWNmZy5ncm91cEJ5LmluZGV4T2YoXCIuXCIpPi0xP2NmZy5ncm91cEJ5LnNwbGl0KFwiLlwiKTpjZmcuZ3JvdXBCeTt2YXIgcHJvcD12YWx1ZVtjZmcuZ3JvdXBCeV07aWYodHlwZW9mIHByb3BzIT1cInN0cmluZ1wiKXtwcm9wPXZhbHVlO3doaWxlKHByb3BzLmxlbmd0aD4wKXtwcm9wPXByb3BbcHJvcHMuc2hpZnQoKV19fWlmKF9ncm91cHNbcHJvcF09PT11bmRlZmluZWQpe19ncm91cHNbcHJvcF09e3RpdGxlOnByb3AsaXRlbXM6W3ZhbHVlXX19ZWxzZXtfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpfX0pfXJldHVybiBkYXRhfSxfdXBkYXRlSGVscGVyOmZ1bmN0aW9uKGh0bWwpe21zLmhlbHBlci5odG1sKGh0bWwpO2lmKCFtcy5oZWxwZXIuaXMoXCI6dmlzaWJsZVwiKSl7bXMuaGVscGVyLmZhZGVJbigpfX0sX3ZhbGlkYXRlU2luZ2xlSXRlbTpmdW5jdGlvbih2YWx1ZSl7aWYoY2ZnLnZyZWdleCE9PW51bGwmJmNmZy52cmVnZXggaW5zdGFuY2VvZiBSZWdFeHApe3JldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpfWVsc2UgaWYoY2ZnLnZ0eXBlIT09bnVsbCl7c3dpdGNoKGNmZy52dHlwZSl7Y2FzZVwiYWxwaGFcIjpyZXR1cm4vXlthLXpBLVpfXSskLy50ZXN0KHZhbHVlKTtjYXNlXCJhbHBoYW51bVwiOnJldHVybi9eW2EtekEtWjAtOV9dKyQvLnRlc3QodmFsdWUpO2Nhc2VcImVtYWlsXCI6cmV0dXJuL14oXFx3KykoW1xcLSsuXVtcXHddKykqQChcXHdbXFwtXFx3XSpcXC4pezEsNX0oW0EtWmEtel0pezIsNn0kLy50ZXN0KHZhbHVlKTtjYXNlXCJ1cmxcIjpyZXR1cm4vKCgoXmh0dHBzPyl8KF5mdHApKTpcXC9cXC8oW1xcLVxcd10rXFwuKStcXHd7MiwzfShcXC9bJVxcLVxcd10rKFxcLlxcd3syLH0pPykqKChbXFx3XFwtXFwuXFw/XFxcXFxcLytAJiM7YH49JSFdKikoXFwuXFx3ezIsfSk/KSpcXC8/KS9pLnRlc3QodmFsdWUpO2Nhc2VcImlwYWRkcmVzc1wiOnJldHVybi9eXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30kLy50ZXN0KHZhbHVlKX19cmV0dXJuIHRydWV9fTt2YXIgaGFuZGxlcnM9e19vbkJsdXI6ZnVuY3Rpb24oKXttcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29sbGFwc2UoKTtfaGFzRm9jdXM9ZmFsc2U7aWYobXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCImJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09dHJ1ZSl7dmFyIG9iaj17fTtvYmpbY2ZnLmRpc3BsYXlGaWVsZF09b2JqW2NmZy52YWx1ZUZpZWxkXT1tcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTttcy5hZGRUb1NlbGVjdGlvbihvYmopfXNlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKG1zLmlzVmFsaWQoKT09PWZhbHNlKXttcy5jb250YWluZXIuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpfWVsc2UgaWYobXMuaW5wdXQudmFsKCkhPT1cIlwiJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PWZhbHNlKXttcy5lbXB0eSgpO3NlbGYuX3VwZGF0ZUhlbHBlcihcIlwiKX0kKG1zKS50cmlnZ2VyKFwiYmx1clwiLFttc10pfSxfb25Db21ib0l0ZW1Nb3VzZU92ZXI6ZnVuY3Rpb24oZSl7dmFyIHRhcmdldD0kKGUuY3VycmVudFRhcmdldCk7aWYoIXRhcmdldC5oYXNDbGFzcyhcIm1zLXJlcy1pdGVtLWRpc2FibGVkXCIpKXttcy5jb21ib2JveC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO3RhcmdldC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX19LF9vbkNvbWJvSXRlbVNlbGVjdGVkOmZ1bmN0aW9uKGUpe3ZhciB0YXJnZXQ9JChlLmN1cnJlbnRUYXJnZXQpO2lmKCF0YXJnZXQuaGFzQ2xhc3MoXCJtcy1yZXMtaXRlbS1kaXNhYmxlZFwiKSl7c2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpfX0sX29uRm9jdXM6ZnVuY3Rpb24oKXttcy5pbnB1dC5mb2N1cygpfSxfb25JbnB1dENsaWNrOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJl9oYXNGb2N1cyl7aWYoY2ZnLnRvZ2dsZU9uQ2xpY2s9PT10cnVlKXtpZihjZmcuZXhwYW5kZWQpe21zLmNvbGxhcHNlKCl9ZWxzZXttcy5leHBhbmQoKX19fX0sX29uSW5wdXRGb2N1czpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiYhX2hhc0ZvY3VzKXtfaGFzRm9jdXM9dHJ1ZTttcy5jb250YWluZXIuYWRkQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTt2YXIgY3VyTGVuZ3RoPW1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO2lmKGNmZy5leHBhbmRPbkZvY3VzPT09dHJ1ZSl7bXMuZXhwYW5kKCl9aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2UgaWYoY3VyTGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtY3VyTGVuZ3RoKSl9c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcImZvY3VzXCIsW21zXSl9fSxfb25LZXlEb3duOmZ1bmN0aW9uKGUpe3ZhciBhY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIiksZnJlZUlucHV0PW1zLmlucHV0LnZhbCgpOyQobXMpLnRyaWdnZXIoXCJrZXlkb3duXCIsW21zLGVdKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5UQUImJihjZmcudXNlVGFiS2V5PT09ZmFsc2V8fGNmZy51c2VUYWJLZXk9PT10cnVlJiZhY3RpdmUubGVuZ3RoPT09MCYmbXMuaW5wdXQudmFsKCkubGVuZ3RoPT09MCkpe2hhbmRsZXJzLl9vbkJsdXIoKTtyZXR1cm59c3dpdGNoKGUua2V5Q29kZSl7Y2FzZSBLRVlDT0RFUy5CQUNLU1BBQ0U6aWYoZnJlZUlucHV0Lmxlbmd0aD09PTAmJm1zLmdldFNlbGVjdGlvbigpLmxlbmd0aD4wJiZjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCIpe19zZWxlY3Rpb24ucG9wKCk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFttcyxtcy5nZXRTZWxlY3Rpb24oKV0pO21zLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmbXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcik7bXMuaW5wdXQuZm9jdXMoKTtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5FU0M6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6aWYoZnJlZUlucHV0IT09XCJcInx8Y2ZnLmV4cGFuZGVkKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DT01NQTppZihjZmcudXNlQ29tbWFLZXk9PT10cnVlKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DVFJMOl9jdHJsRG93bj10cnVlO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOmUucHJldmVudERlZmF1bHQoKTtzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJkb3duXCIpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuVVBBUlJPVzplLnByZXZlbnREZWZhdWx0KCk7c2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7YnJlYWs7ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe2UucHJldmVudERlZmF1bHQoKX1icmVha319LF9vbktleVVwOmZ1bmN0aW9uKGUpe3ZhciBmcmVlSW5wdXQ9bXMuZ2V0UmF3VmFsdWUoKSxpbnB1dFZhbGlkPSQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoPjAmJighY2ZnLm1heEVudHJ5TGVuZ3RofHwkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aDw9Y2ZnLm1heEVudHJ5TGVuZ3RoKSxzZWxlY3RlZCxvYmo9e307JChtcykudHJpZ2dlcihcImtleXVwXCIsW21zLGVdKTtjbGVhclRpbWVvdXQoX3RpbWVyKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5FU0MmJmNmZy5leHBhbmRlZCl7bXMuY29tYm9ib3guaGlkZSgpfWlmKGUua2V5Q29kZT09PUtFWUNPREVTLlRBQiYmY2ZnLnVzZVRhYktleT09PWZhbHNlfHxlLmtleUNvZGU+S0VZQ09ERVMuRU5URVImJmUua2V5Q29kZTxLRVlDT0RFUy5TUEFDRSl7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuQ1RSTCl7X2N0cmxEb3duPWZhbHNlfXJldHVybn1zd2l0Y2goZS5rZXlDb2RlKXtjYXNlIEtFWUNPREVTLlVQQVJST1c6Y2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5DT01NQTppZihlLmtleUNvZGUhPT1LRVlDT0RFUy5DT01NQXx8Y2ZnLnVzZUNvbW1hS2V5PT09dHJ1ZSl7ZS5wcmV2ZW50RGVmYXVsdCgpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3NlbGVjdGVkPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpO2lmKHNlbGVjdGVkLmxlbmd0aD4wKXtzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtyZXR1cm59fWlmKGlucHV0VmFsaWQ9PT10cnVlJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PXRydWUpe29ialtjZmcuZGlzcGxheUZpZWxkXT1vYmpbY2ZnLnZhbHVlRmllbGRdPWZyZWVJbnB1dC50cmltKCk7bXMuYWRkVG9TZWxlY3Rpb24ob2JqKTttcy5jb2xsYXBzZSgpO21zLmlucHV0LmZvY3VzKCl9YnJlYWt9ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXtpZihmcmVlSW5wdXQubGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtZnJlZUlucHV0Lmxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2UgaWYoY2ZnLm1heEVudHJ5TGVuZ3RoJiZmcmVlSW5wdXQubGVuZ3RoPmNmZy5tYXhFbnRyeUxlbmd0aCl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhFbnRyeVJlbmRlcmVyLmNhbGwodGhpcyxmcmVlSW5wdXQubGVuZ3RoLWNmZy5tYXhFbnRyeUxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2V7bXMuaGVscGVyLmhpZGUoKTtpZihjZmcubWluQ2hhcnM8PWZyZWVJbnB1dC5sZW5ndGgpe190aW1lcj1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXttcy5leHBhbmQoKX19LGNmZy50eXBlRGVsYXkpfX19YnJlYWt9fSxfb25UYWdUcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oZSl7bXMucmVtb3ZlRnJvbVNlbGVjdGlvbigkKGUuY3VycmVudFRhcmdldCkuZGF0YShcImpzb25cIikpfSxfb25UcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmIShjZmcuZXhwYW5kT25Gb2N1cz09PXRydWUmJl9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbikpeyQobXMpLnRyaWdnZXIoXCJ0cmlnZ2VyY2xpY2tcIixbbXNdKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfWVsc2V7dmFyIGN1ckxlbmd0aD1tcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtpZihjdXJMZW5ndGg+PWNmZy5taW5DaGFycyl7bXMuaW5wdXQuZm9jdXMoKTttcy5leHBhbmQoKX1lbHNle3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWN1ckxlbmd0aCkpfX19fSxfb25XaW5kb3dSZXNpemVkOmZ1bmN0aW9uKCl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCl9fTtpZihlbGVtZW50IT09bnVsbCl7c2VsZi5fcmVuZGVyKGVsZW1lbnQpfX07JC5mbi5tYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24ob3B0aW9ucyl7dmFyIG9iaj0kKHRoaXMpO2lmKG9iai5zaXplKCk9PT0xJiZvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKSl7cmV0dXJuIG9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpfW9iai5lYWNoKGZ1bmN0aW9uKGkpe3ZhciBjbnRyPSQodGhpcyk7aWYoY250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIpKXtyZXR1cm59aWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJzZWxlY3RcIil7b3B0aW9ucy5kYXRhPVtdO29wdGlvbnMudmFsdWU9W107JC5lYWNoKHRoaXMuY2hpbGRyZW4sZnVuY3Rpb24oaW5kZXgsY2hpbGQpe2lmKGNoaWxkLm5vZGVOYW1lJiZjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJvcHRpb25cIil7b3B0aW9ucy5kYXRhLnB1c2goe2lkOmNoaWxkLnZhbHVlLG5hbWU6Y2hpbGQudGV4dH0pO2lmKCQoY2hpbGQpLmF0dHIoXCJzZWxlY3RlZFwiKSl7b3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKX19fSl9dmFyIGRlZj17fTskLmVhY2godGhpcy5hdHRyaWJ1dGVzLGZ1bmN0aW9uKGksYXR0KXtkZWZbYXR0Lm5hbWVdPWF0dC5uYW1lPT09XCJ2YWx1ZVwiJiZhdHQudmFsdWUhPT1cIlwiP0pTT04ucGFyc2UoYXR0LnZhbHVlKTphdHQudmFsdWV9KTt2YXIgZmllbGQ9bmV3IE1hZ2ljU3VnZ2VzdCh0aGlzLCQuZXh0ZW5kKFtdLCQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLG9wdGlvbnMsZGVmKSk7Y250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpO2ZpZWxkLmNvbnRhaW5lci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpfSk7aWYob2JqLnNpemUoKT09PTEpe3JldHVybiBvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKX1yZXR1cm4gb2JqfTskLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cz17fX0pKGpRdWVyeSk7IiwiLyoqXG4gKiBNdWx0aXBsZSBTZWxlY3Rpb24gQ29tcG9uZW50IGZvciBCb290c3RyYXBcbiAqIENoZWNrIG5pY29sYXNiaXplLmdpdGh1Yi5pby9tYWdpY3N1Z2dlc3QvIGZvciBsYXRlc3QgdXBkYXRlcy5cbiAqXG4gKiBBdXRob3I6ICAgICAgIE5pY29sYXMgQml6ZVxuICogQ3JlYXRlZDogICAgICBGZWIgOHRoIDIwMTNcbiAqIExhc3QgVXBkYXRlZDogT2N0IDE2dGggMjAxNFxuICogVmVyc2lvbjogICAgICAyLjEuNFxuICogTGljZW5jZTogICAgICBNYWdpY1N1Z2dlc3QgaXMgbGljZW5jZWQgdW5kZXIgTUlUIGxpY2VuY2UgKGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQpXG4gKi9cbihmdW5jdGlvbigkKVxue1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBNYWdpY1N1Z2dlc3QgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKVxuICAgIHtcbiAgICAgICAgdmFyIG1zID0gdGhpcztcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2ljU3VnZ2VzdCBjb21wb25lbnRcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIC8qKioqKioqKioqICBDT05GSUdVUkFUSU9OIFBST1BFUlRJRVMgKioqKioqKioqKioqL1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXN0cmljdHMgb3IgYWxsb3dzIHRoZSB1c2VyIHRvIHZhbGlkYXRlIHR5cGVkIGVudHJpZXMuXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhbGxvd0ZyZWVFbnRyaWVzOiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlc3RyaWN0cyBvciBhbGxvd3MgdGhlIHVzZXIgdG8gYWRkIHRoZSBzYW1lIGVudHJ5IG1vcmUgdGhhbiBvbmNlXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byBmYWxzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWxsb3dEdXBsaWNhdGVzOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIGNvbmZpZyBvYmplY3QgcGFzc2VkIHRvIGVhY2ggJC5hamF4IGNhbGxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWpheENvbmZpZzoge30sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgYSBzaW5nbGUgc3VnZ2VzdGlvbiBjb21lcyBvdXQsIGl0IGlzIHByZXNlbGVjdGVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhdXRvU2VsZWN0OiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEF1dG8gc2VsZWN0IHRoZSBmaXJzdCBtYXRjaGluZyBpdGVtIHdpdGggbXVsdGlwbGUgaXRlbXMgc2hvd25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0Rmlyc3Q6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFsbG93IGN1c3RvbWl6YXRpb24gb2YgcXVlcnkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHF1ZXJ5UGFyYW06ICdxdWVyeScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0cmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIGFqYXggcmVxdWVzdCBpcyBzZW50LCBzaW1pbGFyIHRvIGpRdWVyeVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbigpeyB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIENTUyBjbGFzcyB0byBhcHBseSB0byB0aGUgZmllbGQncyB1bmRlcmx5aW5nIGVsZW1lbnQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSlNPTiBEYXRhIHNvdXJjZSB1c2VkIHRvIHBvcHVsYXRlIHRoZSBjb21ibyBib3guIDMgb3B0aW9ucyBhcmUgYXZhaWxhYmxlIGhlcmU6XG4gICAgICAgICAgICAgKiBObyBEYXRhIFNvdXJjZSAoZGVmYXVsdClcbiAgICAgICAgICAgICAqICAgIFdoZW4gbGVmdCBudWxsLCB0aGUgY29tYm8gYm94IHdpbGwgbm90IHN1Z2dlc3QgYW55dGhpbmcuIEl0IGNhbiBzdGlsbCBlbmFibGUgdGhlIHVzZXIgdG8gZW50ZXJcbiAgICAgICAgICAgICAqICAgIG11bHRpcGxlIGVudHJpZXMgaWYgYWxsb3dGcmVlRW50cmllcyBpcyAqIHNldCB0byB0cnVlIChkZWZhdWx0KS5cbiAgICAgICAgICAgICAqIFN0YXRpYyBTb3VyY2VcbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gcGFzcyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMsIGFuIGFycmF5IG9mIHN0cmluZ3Mgb3IgZXZlbiBhIHNpbmdsZSBDU1Ygc3RyaW5nIGFzIHRoZVxuICAgICAgICAgICAgICogICAgZGF0YSBzb3VyY2UuRm9yIGV4LiBkYXRhOiBbKiB7aWQ6MCxuYW1lOlwiUGFyaXNcIn0sIHtpZDogMSwgbmFtZTogXCJOZXcgWW9ya1wifV1cbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gYWxzbyBwYXNzIGFueSBqc29uIG9iamVjdCB3aXRoIHRoZSByZXN1bHRzIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGpzb24gYXJyYXkuXG4gICAgICAgICAgICAgKiBVcmxcbiAgICAgICAgICAgICAqICAgICBZb3UgY2FuIHBhc3MgdGhlIHVybCBmcm9tIHdoaWNoIHRoZSBjb21wb25lbnQgd2lsbCBmZXRjaCBpdHMgSlNPTiBkYXRhLkRhdGEgd2lsbCBiZSBmZXRjaGVkXG4gICAgICAgICAgICAgKiAgICAgdXNpbmcgYSBQT1NUIGFqYXggcmVxdWVzdCB0aGF0IHdpbGwgKiBpbmNsdWRlIHRoZSBlbnRlcmVkIHRleHQgYXMgJ3F1ZXJ5JyBwYXJhbWV0ZXIuIFRoZSByZXN1bHRzXG4gICAgICAgICAgICAgKiAgICAgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIgY2FuIGJlOlxuICAgICAgICAgICAgICogICAgIC0gYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcbiAgICAgICAgICAgICAqICAgICAtIGEgc3RyaW5nIGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIHJlYWR5IHRvIGJlIHBhcnNlZCAoZXg6IFwiW3tpZDouLi4sbmFtZTouLi59LHsuLi59XVwiKVxuICAgICAgICAgICAgICogICAgIC0gYSBKU09OIG9iamVjdCB3aG9zZSBkYXRhIHdpbGwgYmUgY29udGFpbmVkIGluIHRoZSByZXN1bHRzIHByb3BlcnR5XG4gICAgICAgICAgICAgKiAgICAgIChleDoge3Jlc3VsdHM6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV1cbiAgICAgICAgICAgICAqIEZ1bmN0aW9uXG4gICAgICAgICAgICAgKiAgICAgWW91IGNhbiBwYXNzIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcbiAgICAgICAgICAgICAqICAgICBUaGUgZnVuY3Rpb24gY2FuIHJldHVybiB0aGUgSlNPTiBkYXRhIG9yIGl0IGNhbiB1c2UgdGhlIGZpcnN0IGFyZ3VtZW50IGFzIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgZGF0YS5cbiAgICAgICAgICAgICAqICAgICBPbmx5IG9uZSAoY2FsbGJhY2sgZnVuY3Rpb24gb3IgcmV0dXJuIHZhbHVlKSBpcyBuZWVkZWQgZm9yIHRoZSBmdW5jdGlvbiB0byBzdWNjZWVkLlxuICAgICAgICAgICAgICogICAgIFNlZSB0aGUgZm9sbG93aW5nIGV4YW1wbGU6XG4gICAgICAgICAgICAgKiAgICAgZnVuY3Rpb24gKHJlc3BvbnNlKSB7IHZhciBteWpzb24gPSBbe25hbWU6ICd0ZXN0JywgaWQ6IDF9XTsgcmVzcG9uc2UobXlqc29uKTsgcmV0dXJuIG15anNvbjsgfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyB0byB0aGUgYWpheCBjYWxsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRhdGFVcmxQYXJhbXM6IHt9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFN0YXJ0IHRoZSBjb21wb25lbnQgaW4gYSBkaXNhYmxlZCBzdGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCBkZWZpbmVzIHRoZSBkaXNhYmxlZCBiZWhhdmlvdXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzYWJsZWRGaWVsZDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGRpc3BsYXllZCBpbiB0aGUgY29tYm8gbGlzdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkaXNwbGF5RmllbGQ6ICduYW1lJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gZmFsc2UgaWYgeW91IG9ubHkgd2FudCBtb3VzZSBpbnRlcmFjdGlvbi4gSW4gdGhhdCBjYXNlIHRoZSBjb21ibyB3aWxsXG4gICAgICAgICAgICAgKiBhdXRvbWF0aWNhbGx5IGV4cGFuZCBvbiBmb2N1cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZWRpdGFibGU6IHRydWUsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHN0YXJ0aW5nIHN0YXRlIGZvciBjb21iby5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXhwYW5kZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEF1dG9tYXRpY2FsbHkgZXhwYW5kcyBjb21ibyBvbiBmb2N1cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXhwYW5kT25Gb2N1czogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSlNPTiBwcm9wZXJ0eSBieSB3aGljaCB0aGUgbGlzdCBzaG91bGQgYmUgZ3JvdXBlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBncm91cEJ5OiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGhpZGUgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhpZGVUcmlnZ2VyOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBoaWdobGlnaHQgc2VhcmNoIGlucHV0IHdpdGhpbiBkaXNwbGF5ZWQgc3VnZ2VzdGlvbnNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIElEIGZvciB0aGlzIGNvbXBvbmVudFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGNsYXNzIHRoYXQgaXMgYWRkZWQgdG8gdGhlIGluZm8gbWVzc2FnZSBhcHBlYXJpbmcgb24gdGhlIHRvcC1yaWdodCBwYXJ0IG9mIHRoZSBjb21wb25lbnRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5mb01zZ0NsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHBhc3NlZCBvdXQgdG8gdGhlIElOUFVUIHRhZy4gRW5hYmxlcyB1c2FnZSBvZiBBbmd1bGFySlMncyBjdXN0b20gdGFncyBmb3IgZXguXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlucHV0Q2ZnOiB7fSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgY2xhc3MgdGhhdCBpcyBhcHBsaWVkIHRvIHNob3cgdGhhdCB0aGUgZmllbGQgaXMgaW52YWxpZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnZhbGlkQ2xzOiAnbXMtaW52JyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBmaWx0ZXIgZGF0YSByZXN1bHRzIGFjY29yZGluZyB0byBjYXNlLiBVc2VsZXNzIGlmIHRoZSBkYXRhIGlzIGZldGNoZWQgcmVtb3RlbHlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF0Y2hDYXNlOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBPbmNlIGV4cGFuZGVkLCB0aGUgY29tYm8ncyBoZWlnaHQgd2lsbCB0YWtlIGFzIG11Y2ggcm9vbSBhcyB0aGUgIyBvZiBhdmFpbGFibGUgcmVzdWx0cy5cbiAgICAgICAgICAgICAqICAgIEluIGNhc2UgdGhlcmUgYXJlIHRvbyBtYW55IHJlc3VsdHMgZGlzcGxheWVkLCB0aGlzIHdpbGwgZml4IHRoZSBkcm9wIGRvd24gaGVpZ2h0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhEcm9wSGVpZ2h0OiAyOTAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVmaW5lcyBob3cgbG9uZyB0aGUgdXNlciBmcmVlIGVudHJ5IGNhbiBiZS4gU2V0IHRvIG51bGwgZm9yIG5vIGxpbWl0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhFbnRyeUxlbmd0aDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IGVudHJ5IGxlbmd0aCBoYXMgYmVlbiBzdXJwYXNzZWQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heEVudHJ5UmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1BsZWFzZSByZWR1Y2UgeW91ciBlbnRyeSBieSAnICsgdiArICcgY2hhcmFjdGVyJyArICh2ID4gMSA/ICdzJzonJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiByZXN1bHRzIGRpc3BsYXllZCBpbiB0aGUgY29tYm8gZHJvcCBkb3duIGF0IG9uY2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFN1Z2dlc3Rpb25zOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0aGUgdXNlciBjYW4gc2VsZWN0IGlmIG11bHRpcGxlIHNlbGVjdGlvbiBpcyBhbGxvd2VkLlxuICAgICAgICAgICAgICogICAgU2V0IHRvIG51bGwgdG8gcmVtb3ZlIHRoZSBsaW1pdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4U2VsZWN0aW9uOiAxMCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IHNlbGVjdGlvbiBhbW91bnQgaGFzIGJlZW4gcmVhY2hlZC4gVGhlIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZVxuICAgICAgICAgICAgICogICAgcGFyYW1ldGVyIHdoaWNoIGlzIHRoZSBudW1iZXIgb2Ygc2VsZWN0ZWQgZWxlbWVudHMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFNlbGVjdGlvblJlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gJyArIHYgKyAnIGl0ZW0nICsgKHYgPiAxID8gJ3MnOicnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG1ldGhvZCB1c2VkIGJ5IHRoZSBhamF4IHJlcXVlc3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtaW5pbXVtIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRoZSB1c2VyIG11c3QgdHlwZSBiZWZvcmUgdGhlIGNvbWJvIGV4cGFuZHMgYW5kIG9mZmVycyBzdWdnZXN0aW9ucy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWluQ2hhcnM6IDAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gbm90IGVub3VnaCBsZXR0ZXJzIGFyZSBzZXQuIFRoZSBmdW5jdGlvbiBoYXMgYSBzaW5nbGVcbiAgICAgICAgICAgICAqICAgIHBhcmFtZXRlciB3aGljaCBpcyB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSByZXF1aXJlZCBhbW91bnQgb2YgbGV0dGVycyBhbmQgdGhlIGN1cnJlbnQgb25lLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW5DaGFyc1JlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdQbGVhc2UgdHlwZSAnICsgdiArICcgbW9yZSBjaGFyYWN0ZXInICsgKHYgPiAxID8gJ3MnOicnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogV2hldGhlciBvciBub3Qgc29ydGluZyAvIGZpbHRlcmluZyBzaG91bGQgYmUgZG9uZSByZW1vdGVseSBvciBsb2NhbGx5LlxuICAgICAgICAgICAgICogVXNlIGVpdGhlciAnbG9jYWwnIG9yICdyZW1vdGUnXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1vZGU6ICdsb2NhbCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG5hbWUgdXNlZCBhcyBhIGZvcm0gZWxlbWVudC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbmFtZTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGV4dCBkaXNwbGF5ZWQgd2hlbiB0aGVyZSBhcmUgbm8gc3VnZ2VzdGlvbnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG5vU3VnZ2VzdGlvblRleHQ6ICdObyBzdWdnZXN0aW9ucycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIGRlZmF1bHQgcGxhY2Vob2xkZXIgdGV4dCB3aGVuIG5vdGhpbmcgaGFzIGJlZW4gZW50ZXJlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1R5cGUgb3IgY2xpY2sgaGVyZScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB1c2VkIHRvIGRlZmluZSBob3cgdGhlIGl0ZW1zIHdpbGwgYmUgcHJlc2VudGVkIGluIHRoZSBjb21ib1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZW5kZXJlcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGlzIGZpZWxkIHNob3VsZCBiZSByZXF1aXJlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gcmVuZGVyIHNlbGVjdGlvbiBhcyBhIGRlbGltaXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVzdWx0QXNTdHJpbmc6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRleHQgZGVsaW1pdGVyIHRvIHVzZSBpbiBhIGRlbGltaXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOiAnLCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgdGhlIGxpc3Qgb2Ygc3VnZ2VzdGVkIG9iamVjdHNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVzdWx0c0ZpZWxkOiAncmVzdWx0cycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBjdXN0b20gQ1NTIGNsYXNzIHRvIGFkZCB0byBhIHNlbGVjdGVkIGl0ZW1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uQ2xzOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbiBvcHRpb25hbCBlbGVtZW50IHJlcGxhY2VtZW50IGluIHdoaWNoIHRoZSBzZWxlY3Rpb24gaXMgcmVuZGVyZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uQ29udGFpbmVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFdoZXJlIHRoZSBzZWxlY3RlZCBpdGVtcyB3aWxsIGJlIGRpc3BsYXllZC4gT25seSAncmlnaHQnLCAnYm90dG9tJyBhbmQgJ2lubmVyJyBhcmUgdmFsaWQgdmFsdWVzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblBvc2l0aW9uOiAnaW5uZXInLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdXNlZCB0byBkZWZpbmUgaG93IHRoZSBpdGVtcyB3aWxsIGJlIHByZXNlbnRlZCBpbiB0aGUgdGFnIGxpc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uUmVuZGVyZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gc3RhY2sgdGhlIHNlbGVjdGlvbmVkIGl0ZW1zIHdoZW4gcG9zaXRpb25lZCBvbiB0aGUgYm90dG9tXG4gICAgICAgICAgICAgKiAgICBSZXF1aXJlcyB0aGUgc2VsZWN0aW9uUG9zaXRpb24gdG8gYmUgc2V0IHRvICdib3R0b20nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblN0YWNrZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERpcmVjdGlvbiB1c2VkIGZvciBzb3J0aW5nLiBPbmx5ICdhc2MnIGFuZCAnZGVzYycgYXJlIHZhbGlkIHZhbHVlc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzb3J0RGlyOiAnYXNjJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBuYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGZvciBsb2NhbCByZXN1bHQgc29ydGluZy5cbiAgICAgICAgICAgICAqICAgIExlYXZlIG51bGwgaWYgeW91IGRvIG5vdCB3aXNoIHRoZSByZXN1bHRzIHRvIGJlIG9yZGVyZWQgb3IgaWYgdGhleSBhcmUgYWxyZWFkeSBvcmRlcmVkIHJlbW90ZWx5LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzb3J0T3JkZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHN1Z2dlc3Rpb25zIHdpbGwgaGF2ZSB0byBzdGFydCBieSB1c2VyIGlucHV0IChhbmQgbm90IHNpbXBseSBjb250YWluIGl0IGFzIGEgc3Vic3RyaW5nKVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzdHJpY3RTdWdnZXN0OiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDdXN0b20gc3R5bGUgYWRkZWQgdG8gdGhlIGNvbXBvbmVudCBjb250YWluZXIuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHN0eWxlOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGNvbWJvIHdpbGwgZXhwYW5kIC8gY29sbGFwc2Ugd2hlbiBjbGlja2VkIHVwb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdG9nZ2xlT25DbGljazogZmFsc2UsXG5cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbW91bnQgKGluIG1zKSBiZXR3ZWVuIGtleWJvYXJkIHJlZ2lzdGVycy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdHlwZURlbGF5OiA0MDAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHRhYiB3b24ndCBibHVyIHRoZSBjb21wb25lbnQgYnV0IHdpbGwgYmUgcmVnaXN0ZXJlZCBhcyB0aGUgRU5URVIga2V5XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVzZVRhYktleTogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHVzaW5nIGNvbW1hIHdpbGwgdmFsaWRhdGUgdGhlIHVzZXIncyBjaG9pY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdXNlQ29tbWFLZXk6IHRydWUsXG5cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRoZSByZXN1bHRzIHdpbGwgYmUgZGlzcGxheWVkIHdpdGggYSB6ZWJyYSB0YWJsZSBzdHlsZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1c2VaZWJyYVN0eWxlOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBpbml0aWFsIHZhbHVlIGZvciB0aGUgZmllbGRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFsdWU6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgaXRzIHVuZGVybHlpbmcgdmFsdWVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFsdWVGaWVsZDogJ2lkJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiByZWd1bGFyIGV4cHJlc3Npb24gdG8gdmFsaWRhdGUgdGhlIHZhbHVlcyBhZ2FpbnN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZyZWdleDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiB0eXBlIHRvIHZhbGlkYXRlIGFnYWluc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdnR5cGU6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY29uZiA9ICQuZXh0ZW5kKHt9LG9wdGlvbnMpO1xuICAgICAgICB2YXIgY2ZnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25mKTtcblxuICAgICAgICAvKioqKioqKioqKiAgUFVCTElDIE1FVEhPRFMgKioqKioqKioqKioqL1xuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIG9uZSBvciBtdWx0aXBsZSBqc29uIGl0ZW1zIHRvIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zLCBpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCFjZmcubWF4U2VsZWN0aW9uIHx8IF9zZWxlY3Rpb24ubGVuZ3RoIDwgY2ZnLm1heFNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICghJC5pc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZWNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYWxsb3dEdXBsaWNhdGVzIHx8ICQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSwgbXMuZ2V0VmFsdWUoKSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnB1c2goanNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZWNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1NpbGVudCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbdGhpcywgdGhpcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbihpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uKF9zZWxlY3Rpb24uc2xpY2UoMCksIGlzU2lsZW50KTsgLy8gY2xvbmUgYXJyYXkgdG8gYXZvaWQgY29uY3VycmVuY3kgaXNzdWVzXG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbGxhcHNlIHRoZSBkcm9wIGRvd24gcGFydCBvZiB0aGUgY29tYm9cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGFwc2UgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWJvYm94LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignY29sbGFwc2UnLCBbdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgdGhlIGNvbXBvbmVudCBpbiBhIGRpc2FibGVkIHN0YXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5kaXNhYmxlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWRpc2FibGVkJyk7XG4gICAgICAgICAgICBjZmcuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW1wdGllcyBvdXQgdGhlIGNvbWJvIHVzZXIgdGV4dFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbXB0eSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmlucHV0LnZhbCgnJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB0aGUgY29tcG9uZW50IGluIGEgZW5hYmxlIHN0YXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbmFibGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdtcy1jdG4tZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNmZy5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV4cGFuZCB0aGUgZHJvcCBkcm93biBwYXJ0IG9mIHRoZSBjb21iby5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXhwYW5kID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIWNmZy5leHBhbmRlZCAmJiAodGhpcy5pbnB1dC52YWwoKS5sZW5ndGggPj0gY2ZnLm1pbkNoYXJzIHx8IHRoaXMuY29tYm9ib3guY2hpbGRyZW4oKS5zaXplKCkgPiAwKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tYm9ib3guYXBwZW5kVG8odGhpcy5jb250YWluZXIpO1xuICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdleHBhbmQnLCBbdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBjb21wb25lbnQgZW5hYmxlZCBzdGF0dXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5kaXNhYmxlZDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGZpZWxkIGlzIHZhbGlkIG9yIG5vdFxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc1ZhbGlkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmFsaWQgPSBjZmcucmVxdWlyZWQgPT09IGZhbHNlIHx8IF9zZWxlY3Rpb24ubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGlmKGNmZy52dHlwZSB8fCBjZmcudnJlZ2V4KXtcbiAgICAgICAgICAgICAgICAkLmVhY2goX3NlbGVjdGlvbiwgZnVuY3Rpb24oaW5kZXgsIGl0ZW0pe1xuICAgICAgICAgICAgICAgICAgICB2YWxpZCA9IHZhbGlkICYmIHNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbShpdGVtW2NmZy52YWx1ZUZpZWxkXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHMgdGhlIGRhdGEgcGFyYW1zIGZvciBjdXJyZW50IGFqYXggcmVxdWVzdFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHMgdGhlIG5hbWUgZ2l2ZW4gdG8gdGhlIGZvcm0gaW5wdXRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0TmFtZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5uYW1lO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBhbiBhcnJheSBvZiBzZWxlY3RlZCBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHJldHVybiB7QXJyYXl9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIF9zZWxlY3Rpb247XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBjdXJyZW50IHRleHQgZW50ZXJlZCBieSB0aGUgdXNlclxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRSYXdWYWx1ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gbXMuaW5wdXQudmFsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIGFuIGFycmF5IG9mIHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRWYWx1ZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICQubWFwKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb1tjZmcudmFsdWVGaWVsZF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIG9uZSBvciBtdWx0aXBsZXMganNvbiBpdGVtcyBmcm9tIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMsIGlzU2lsZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoISQuaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFsdWVjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSAkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sIG1zLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYoaXNTaWxlbnQgIT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFt0aGlzLCB0aGlzLmdldFNlbGVjdGlvbigpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiB0aGlzLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldCBjdXJyZW50IGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gX2NiRGF0YTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHVwIHNvbWUgY29tYm8gZGF0YSBhZnRlciBpdCBoYXMgYmVlbiByZW5kZXJlZFxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBjZmcuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyB0aGUgbmFtZSBmb3IgdGhlIGlucHV0IGZpZWxkIHNvIGl0IGNhbiBiZSBmZXRjaGVkIGluIHRoZSBmb3JtXG4gICAgICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldE5hbWUgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgICAgIGNmZy5uYW1lID0gbmFtZTtcbiAgICAgICAgICAgIGlmKG5hbWUpe1xuICAgICAgICAgICAgICAgIGNmZy5uYW1lICs9IG5hbWUuaW5kZXhPZignW10nKSA+IDAgPyAnJyA6ICdbXSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIpe1xuICAgICAgICAgICAgICAgICQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSwgZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgICAgICAgICBlbC5uYW1lID0gY2ZnLm5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHdpdGggdGhlIEpTT04gaXRlbXMgcHJvdmlkZWRcbiAgICAgICAgICogQHBhcmFtIGl0ZW1zXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zKXtcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGEgdmFsdWUgZm9yIHRoZSBjb21ibyBib3guIFZhbHVlIG11c3QgYmUgYW4gYXJyYXkgb2YgdmFsdWVzIHdpdGggZGF0YSB0eXBlIG1hdGNoaW5nIHZhbHVlRmllbGQgb25lLlxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlcylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGl0ZW1zID0gW107XG5cbiAgICAgICAgICAgICQuZWFjaCh2YWx1ZXMsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGZpcnN0IHRyeSB0byBzZWUgaWYgd2UgaGF2ZSB0aGUgZnVsbCBvYmplY3RzIGZyb20gb3VyIGRhdGEgc2V0XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJC5lYWNoKF9jYkRhdGEsIGZ1bmN0aW9uKGksaXRlbSl7XG4gICAgICAgICAgICAgICAgICAgIGlmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdID09IHZhbHVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZighZm91bmQpe1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YodmFsdWUpID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW2NmZy52YWx1ZUZpZWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbltjZmcuZGlzcGxheUZpZWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYoaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGRhdGEgcGFyYW1zIGZvciBzdWJzZXF1ZW50IGFqYXggcmVxdWVzdHNcbiAgICAgICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKVxuICAgICAgICB7XG4gICAgICAgICAgICBjZmcuZGF0YVVybFBhcmFtcyA9ICQuZXh0ZW5kKHt9LHBhcmFtcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqKioqKioqKiogIFBSSVZBVEUgKioqKioqKioqKioqL1xuICAgICAgICB2YXIgX3NlbGVjdGlvbiA9IFtdLCAgICAgIC8vIHNlbGVjdGVkIG9iamVjdHNcbiAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSAwLCAvLyBoZWlnaHQgZm9yIGVhY2ggY29tYm8gaXRlbS5cbiAgICAgICAgICAgIF90aW1lcixcbiAgICAgICAgICAgIF9oYXNGb2N1cyA9IGZhbHNlLFxuICAgICAgICAgICAgX2dyb3VwcyA9IG51bGwsXG4gICAgICAgICAgICBfY2JEYXRhID0gW10sXG4gICAgICAgICAgICBfY3RybERvd24gPSBmYWxzZSxcbiAgICAgICAgICAgIEtFWUNPREVTID0ge1xuICAgICAgICAgICAgICAgIEJBQ0tTUEFDRTogOCxcbiAgICAgICAgICAgICAgICBUQUI6IDksXG4gICAgICAgICAgICAgICAgRU5URVI6IDEzLFxuICAgICAgICAgICAgICAgIENUUkw6IDE3LFxuICAgICAgICAgICAgICAgIEVTQzogMjcsXG4gICAgICAgICAgICAgICAgU1BBQ0U6IDMyLFxuICAgICAgICAgICAgICAgIFVQQVJST1c6IDM4LFxuICAgICAgICAgICAgICAgIERPV05BUlJPVzogNDAsXG4gICAgICAgICAgICAgICAgQ09NTUE6IDE4OFxuICAgICAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbXB0aWVzIHRoZSByZXN1bHQgY29udGFpbmVyIGFuZCByZWZpbGxzIGl0IHdpdGggdGhlIGFycmF5IG9mIGpzb24gcmVzdWx0cyBpbiBpbnB1dFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2Rpc3BsYXlTdWdnZXN0aW9uczogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNob3coKTtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5lbXB0eSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHJlc0hlaWdodCA9IDAsIC8vIHRvdGFsIGhlaWdodCB0YWtlbiBieSBkaXNwbGF5ZWQgcmVzdWx0cy5cbiAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgPSAwO1xuXG4gICAgICAgICAgICAgICAgaWYoX2dyb3VwcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSBfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWdyb3VwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBncnBOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKF9ncm91cHNbZ3JwTmFtZV0uaXRlbXMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBfZ3JvdXBJdGVtSGVpZ2h0ID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1ncm91cCcpLm91dGVySGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKF9ncm91cEl0ZW1IZWlnaHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wUmVzSGVpZ2h0ID0gbmJHcm91cHMgKiBfZ3JvdXBJdGVtSGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IChfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGgpICsgdG1wUmVzSGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IF9jb21ib0l0ZW1IZWlnaHQgKiAoZGF0YS5sZW5ndGggKyBuYkdyb3Vwcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihyZXNIZWlnaHQgPCBtcy5jb21ib2JveC5oZWlnaHQoKSB8fCByZXNIZWlnaHQgPD0gY2ZnLm1heERyb3BIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGVpZ2h0KHJlc0hlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYocmVzSGVpZ2h0ID49IG1zLmNvbWJvYm94LmhlaWdodCgpICYmIHJlc0hlaWdodCA+IGNmZy5tYXhEcm9wSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDEgJiYgY2ZnLmF1dG9TZWxlY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0JykuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjZmcuc2VsZWN0Rmlyc3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpLmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRSYXdWYWx1ZSgpICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBub1N1Z2dlc3Rpb25UZXh0ID0gY2ZnLm5vU3VnZ2VzdGlvblRleHQucmVwbGFjZSgvXFx7XFx7LipcXH1cXH0vLCBtcy5pbnB1dC52YWwoKSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihub1N1Z2dlc3Rpb25UZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXaGVuIGZyZWUgZW50cnkgaXMgb2ZmLCBhZGQgaW52YWxpZCBjbGFzcyB0byBpbnB1dCBpZiBubyBkYXRhIG1hdGNoZXNcbiAgICAgICAgICAgICAgICBpZihjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJChtcy5pbnB1dCkuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQobXMuaW5wdXQpLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YganNvbiBvYmplY3RzIGZyb20gYW4gYXJyYXkgb2Ygc3RyaW5ncy5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSBbXTtcbiAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVudHJ5ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5W2NmZy5kaXNwbGF5RmllbGRdID0gZW50cnlbY2ZnLnZhbHVlRmllbGRdID0gJC50cmltKHMpO1xuICAgICAgICAgICAgICAgICAgICBqc29uLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBqc29uO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXBsYWNlcyBodG1sIHdpdGggaGlnaGxpZ2h0ZWQgaHRtbCBhY2NvcmRpbmcgdG8gY2FzZVxuICAgICAgICAgICAgICogQHBhcmFtIGh0bWxcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9oaWdobGlnaHRTdWdnZXN0aW9uOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgICAgICAgICAgdmFyIHEgPSBtcy5pbnB1dC52YWwoKTtcblxuICAgICAgICAgICAgICAgIC8vZXNjYXBlIHNwZWNpYWwgcmVnZXggY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHZhciBzcGVjaWFsQ2hhcmFjdGVycyA9IFsnXicsICckJywgJyonLCAnKycsICc/JywgJy4nLCAnKCcsICcpJywgJzonLCAnIScsICd8JywgJ3snLCAnfScsICdbJywgJ10nXTtcblxuICAgICAgICAgICAgICAgICQuZWFjaChzcGVjaWFsQ2hhcmFjdGVycywgZnVuY3Rpb24gKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBxID0gcS5yZXBsYWNlKHZhbHVlLCBcIlxcXFxcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGh0bWw7IC8vIG5vdGhpbmcgZW50ZXJlZCBhcyBpbnB1dFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBnbG9iID0gY2ZnLm1hdGNoQ2FzZSA9PT0gdHJ1ZSA/ICdnJyA6ICdnaSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0bWwucmVwbGFjZShuZXcgUmVnRXhwKCcoJyArIHEgKyAnKSg/IShbXjxdKyk/PiknLCBnbG9iKSwgJzxlbT4kMTwvZW0+Jyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE1vdmVzIHRoZSBzZWxlY3RlZCBjdXJzb3IgYW1vbmdzdCB0aGUgbGlzdCBpdGVtXG4gICAgICAgICAgICAgKiBAcGFyYW0gZGlyIC0gJ3VwJyBvciAnZG93bidcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9tb3ZlU2VsZWN0ZWRSb3c6IGZ1bmN0aW9uKGRpcikge1xuICAgICAgICAgICAgICAgIGlmKCFjZmcuZXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBsaXN0LCBzdGFydCwgYWN0aXZlLCBzY3JvbGxQb3M7XG4gICAgICAgICAgICAgICAgbGlzdCA9IG1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIik7XG4gICAgICAgICAgICAgICAgaWYoZGlyID09PSAnZG93bicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0aXZlID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpO1xuICAgICAgICAgICAgICAgIGlmKGFjdGl2ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGRpciA9PT0gJ2Rvd24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5uZXh0QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsUG9zID0gbXMuY29tYm9ib3guc2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydFswXS5vZmZzZXRUb3AgKyBzdGFydC5vdXRlckhlaWdodCgpID4gbXMuY29tYm9ib3guaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3Aoc2Nyb2xsUG9zICsgX2NvbWJvSXRlbUhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5wcmV2QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoX2NvbWJvSXRlbUhlaWdodCAqIGxpc3QubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0WzBdLm9mZnNldFRvcCA8IG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpIC0gX2NvbWJvSXRlbUhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGlzdC5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcbiAgICAgICAgICAgICAgICBzdGFydC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWNjb3JkaW5nIHRvIGdpdmVuIGRhdGEgYW5kIHF1ZXJ5LCBzb3J0IGFuZCBhZGQgc3VnZ2VzdGlvbnMgaW4gdGhlaXIgY29udGFpbmVyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcHJvY2Vzc1N1Z2dlc3Rpb25zOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIganNvbiA9IG51bGwsIGRhdGEgPSBzb3VyY2UgfHwgY2ZnLmRhdGE7XG4gICAgICAgICAgICAgICAgaWYoZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoZGF0YSkgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGRhdGEuY2FsbChtcywgbXMuZ2V0UmF3VmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEpID09PSAnc3RyaW5nJykgeyAvLyBnZXQgcmVzdWx0cyBmcm9tIGFqYXhcbiAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2JlZm9yZWxvYWQnLCBbbXNdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVBhcmFtc1tjZmcucXVlcnlQYXJhbV0gPSBtcy5pbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSAkLmV4dGVuZChxdWVyeVBhcmFtcywgY2ZnLmRhdGFVcmxQYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJC5hamF4KCQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjZmcubWV0aG9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogY2ZnLmJlZm9yZVNlbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oYXN5bmNEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbiA9IHR5cGVvZihhc3luY0RhdGEpID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UoYXN5bmNEYXRhKSA6IGFzeW5jRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdsb2FkJywgW21zLCBqc29uXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGYuX2FzeW5jVmFsdWVzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKHR5cGVvZihzZWxmLl9hc3luY1ZhbHVlcykgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShzZWxmLl9hc3luY1ZhbHVlcykgOiBzZWxmLl9hc3luY1ZhbHVlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZShzZWxmLl9hc3luY1ZhbHVlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyhcIkNvdWxkIG5vdCByZWFjaCBzZXJ2ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgY2ZnLmFqYXhDb25maWcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVzdWx0cyBmcm9tIGxvY2FsIGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA+IDAgJiYgdHlwZW9mKGRhdGFbMF0pID09PSAnc3RyaW5nJykgeyAvLyByZXN1bHRzIGZyb20gYXJyYXkgb2Ygc3RyaW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBzZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVndWxhciBqc29uIGFycmF5IG9yIGpzb24gb2JqZWN0IHdpdGggcmVzdWx0cyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBkYXRhW2NmZy5yZXN1bHRzRmllbGRdIHx8IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBjZmcubW9kZSA9PT0gJ3JlbW90ZScgPyBfY2JEYXRhIDogc2VsZi5fc29ydEFuZFRyaW0oX2NiRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2Rpc3BsYXlTdWdnZXN0aW9ucyhzZWxmLl9ncm91cChzb3J0ZWREYXRhKSk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbmRlciB0aGUgY29tcG9uZW50IHRvIHRoZSBnaXZlbiBpbnB1dCBET00gZWxlbWVudFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3JlbmRlcjogZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgICAgICBtcy5zZXROYW1lKGNmZy5uYW1lKTsgIC8vIG1ha2Ugc3VyZSB0aGUgZm9ybSBuYW1lIGlzIGNvcnJlY3RcbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgbWFpbiBkaXYsIHdpbGwgcmVsYXkgdGhlIGZvY3VzIGV2ZW50cyB0byB0aGUgY29udGFpbmVkIGlucHV0IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY3RuIGZvcm0tY29udHJvbCAnICsgKGNmZy5yZXN1bHRBc1N0cmluZyA/ICdtcy1hcy1zdHJpbmcgJyA6ICcnKSArIGNmZy5jbHMgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1sZycpID8gJyBpbnB1dC1sZycgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1zbScpID8gJyBpbnB1dC1zbScgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5kaXNhYmxlZCA9PT0gdHJ1ZSA/ICcgbXMtY3RuLWRpc2FibGVkJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWN0bi1yZWFkb25seScpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlID8gJycgOiAnIG1zLW5vLXRyaWdnZXInKSxcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IGNmZy5zdHlsZSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGNmZy5pZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmJsdXIoJC5wcm94eShoYW5kbGVycy5fb25CbHVyLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleWRvd24oJC5wcm94eShoYW5kbGVycy5fb25LZXlEb3duLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgIG1zLmlucHV0ID0gJCgnPGlucHV0Lz4nLCAkLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWlucHV0LXJlYWRvbmx5JyxcbiAgICAgICAgICAgICAgICAgICAgcmVhZG9ubHk6ICFjZmcuZWRpdGFibGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjZmcucGxhY2Vob2xkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjZmcuZGlzYWJsZWRcbiAgICAgICAgICAgICAgICB9LCBjZmcuaW5wdXRDZmcpKTtcblxuICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmlucHV0LmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRDbGljaywgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHN1Z2dlc3Rpb25zLiB3aWxsIGFsd2F5cyBiZSBwbGFjZWQgb24gZm9jdXNcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1jdG4gZHJvcGRvd24tbWVudSdcbiAgICAgICAgICAgICAgICB9KS5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgLy8gYmluZCB0aGUgb25jbGljayBhbmQgbW91c2VvdmVyIHVzaW5nIGRlbGVnYXRlZCBldmVudHMgKG5lZWRzIGpRdWVyeSA+PSAxLjcpXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3gub24oJ2NsaWNrJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtU2VsZWN0ZWQsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5vbignbW91c2VvdmVyJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtTW91c2VPdmVyLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcjtcbiAgICAgICAgICAgICAgICAgICAgJChtcy5zZWxlY3Rpb25Db250YWluZXIpLmFkZENsYXNzKCdtcy1zZWwtY3RuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1jdG4nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cywgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmICFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbXMuaGVscGVyID0gJCgnPHNwYW4vPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWhlbHBlciAnICsgY2ZnLmluZm9Nc2dDbHNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoKTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLmhlbHBlcik7XG5cblxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgd2hvbGUgdGhpbmdcbiAgICAgICAgICAgICAgICAkKGVsKS5yZXBsYWNlV2l0aChtcy5jb250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2goY2ZnLnNlbGVjdGlvblBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib3R0b20nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25TdGFja2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci53aWR0aChtcy5jb250YWluZXIud2lkdGgoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hZGRDbGFzcygnbXMtc3RhY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuY3NzKCdmbG9hdCcsICdsZWZ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuc2VsZWN0aW9uQ29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0IHNpZGVcbiAgICAgICAgICAgICAgICBpZihjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnRyaWdnZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtdHJpZ2dlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiAnPGRpdiBjbGFzcz1cIm1zLXRyaWdnZXItaWNvXCI+PC9kaXY+J1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgbXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljaywgdGhpcykpO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLnRyaWdnZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQod2luZG93KS5yZXNpemUoJC5wcm94eShoYW5kbGVycy5fb25XaW5kb3dSZXNpemVkLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBkbyBub3QgcGVyZm9ybSBhbiBpbml0aWFsIGNhbGwgaWYgd2UgYXJlIHVzaW5nIGFqYXggdW5sZXNzIHdlIGhhdmUgaW5pdGlhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwgfHwgY2ZnLmRhdGEgIT09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoY2ZnLmRhdGEpID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9hc3luY1ZhbHVlcyA9IGNmZy52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKGNmZy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQoXCJib2R5XCIpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobXMuY29udGFpbmVyLmhhc0NsYXNzKCdtcy1jdG4tZm9jdXMnKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmhhcyhlLnRhcmdldCkubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbXMtcmVzLWl0ZW0nKSA8IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKCdtcy1jbG9zZS1idG4nKSA8IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lclswXSAhPT0gZS50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbmRlcnMgZWFjaCBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcmVuZGVyQ29tYm9JdGVtczogZnVuY3Rpb24oaXRlbXMsIGlzR3JvdXBlZCkge1xuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCBodG1sID0gJyc7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpc3BsYXllZCA9IGNmZy5yZW5kZXJlciAhPT0gbnVsbCA/IGNmZy5yZW5kZXJlci5jYWxsKHJlZiwgdmFsdWUpIDogdmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNhYmxlZCA9IGNmZy5kaXNhYmxlZEZpZWxkICE9PSBudWxsICYmIHZhbHVlW2NmZy5kaXNhYmxlZEZpZWxkXSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtaXRlbSAnICsgKGlzR3JvdXBlZCA/ICdtcy1yZXMtaXRlbS1ncm91cGVkICc6JycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGlzYWJsZWQgPyAnbXMtcmVzLWl0ZW0tZGlzYWJsZWQgJzonJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChpbmRleCAlIDIgPT09IDEgJiYgY2ZnLnVzZVplYnJhU3R5bGUgPT09IHRydWUgPyAnbXMtcmVzLW9kZCcgOiAnJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBjZmcuaGlnaGxpZ2h0ID09PSB0cnVlID8gc2VsZi5faGlnaGxpZ2h0U3VnZ2VzdGlvbihkaXNwbGF5ZWQpIDogZGlzcGxheWVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGEtanNvbic6IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAkKCc8ZGl2Lz4nKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guYXBwZW5kKGh0bWwpO1xuICAgICAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW06Zmlyc3QnKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW5kZXJzIHRoZSBzZWxlY3RlZCBpdGVtcyBpbnRvIHRoZWlyIGNvbnRhaW5lci5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9yZW5kZXJTZWxlY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCB3ID0gMCwgaW5wdXRPZmZzZXQgPSAwLCBpdGVtcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBhc1RleHQgPSBjZmcucmVzdWx0QXNTdHJpbmcgPT09IHRydWUgJiYgIV9oYXNGb2N1cztcblxuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5maW5kKCcubXMtc2VsLWl0ZW0nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJC5lYWNoKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSl7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkSXRlbUVsLCBkZWxJdGVtRWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1IdG1sID0gY2ZnLnNlbGVjdGlvblJlbmRlcmVyICE9PSBudWxsID8gY2ZnLnNlbGVjdGlvblJlbmRlcmVyLmNhbGwocmVmLCB2YWx1ZSkgOiB2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsaWRDbHMgPSBzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0odmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF0pID8gJycgOiAnIG1zLXNlbC1pbnZhbGlkJztcblxuICAgICAgICAgICAgICAgICAgICAvLyB0YWcgcmVwcmVzZW50aW5nIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGlmKGFzVGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1pdGVtIG1zLXNlbC10ZXh0ICcgKyBjZmcuc2VsZWN0aW9uQ2xzICsgdmFsaWRDbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogc2VsZWN0ZWRJdGVtSHRtbCArIChpbmRleCA9PT0gKF9zZWxlY3Rpb24ubGVuZ3RoIC0gMSkgPyAnJyA6IGNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWl0ZW0gJyArIGNmZy5zZWxlY3Rpb25DbHMgKyB2YWxpZENscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBzZWxlY3RlZEl0ZW1IdG1sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZGlzYWJsZWQgPT09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzbWFsbCBjcm9zcyBpbWdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxJdGVtRWwgPSAkKCc8c3Bhbi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY2xvc2UtYnRuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsSXRlbUVsLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVGFnVHJpZ2dlckNsaWNrLCByZWYpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goc2VsZWN0ZWRJdGVtRWwpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5wcmVwZW5kKGl0ZW1zKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIHRoZSB2YWx1ZXMsIGJlaGF2aW91ciBvZiBtdWx0aXBsZSBzZWxlY3RcbiAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiAnZGlzcGxheTogbm9uZTsnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJC5lYWNoKG1zLmdldFZhbHVlKCksIGZ1bmN0aW9uKGksIHZhbCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbCA9ICQoJzxpbnB1dC8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjZmcubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZFRvKG1zLl92YWx1ZUNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyLmFwcGVuZFRvKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgIWNmZy5zZWxlY3Rpb25Db250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQud2lkdGgoMCk7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0T2Zmc2V0ID0gbXMuaW5wdXQub2Zmc2V0KCkubGVmdCAtIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0O1xuICAgICAgICAgICAgICAgICAgICB3ID0gbXMuY29udGFpbmVyLndpZHRoKCkgLSBpbnB1dE9mZnNldCAtIDQyO1xuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC53aWR0aCh3KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZWxlY3QgYW4gaXRlbSBlaXRoZXIgdGhyb3VnaCBrZXlib2FyZCBvciBtb3VzZVxuICAgICAgICAgICAgICogQHBhcmFtIGl0ZW1cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9zZWxlY3RJdGVtOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYoY2ZnLm1heFNlbGVjdGlvbiA9PT0gMSl7XG4gICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKCdqc29uJykpO1xuICAgICAgICAgICAgICAgIGl0ZW0ucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzID09PSBmYWxzZSB8fCBfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKCFfaGFzRm9jdXMpe1xuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihfaGFzRm9jdXMgJiYgKGNmZy5leHBhbmRPbkZvY3VzIHx8IF9jdHJsRG93bikpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoX2N0cmxEb3duKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTb3J0cyB0aGUgcmVzdWx0cyBhbmQgY3V0IHRoZW0gZG93biB0byBtYXggIyBvZiBkaXNwbGF5ZWQgcmVzdWx0cyBhdCBvbmNlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfc29ydEFuZFRyaW06IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcSA9IG1zLmdldFJhd1ZhbHVlKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gW10sXG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gW10sXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzID0gbXMuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgdGhlIGRhdGEgYWNjb3JkaW5nIHRvIGdpdmVuIGlucHV0XG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG9ialtjZmcuZGlzcGxheUZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChjZmcubWF0Y2hDYXNlID09PSB0cnVlICYmIG5hbWUuaW5kZXhPZihxKSA+IC0xKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjZmcubWF0Y2hDYXNlID09PSBmYWxzZSAmJiBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpID4gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnN0cmljdFN1Z2dlc3QgPT09IGZhbHNlIHx8IG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQucHVzaChvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IGRhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRha2Ugb3V0IHRoZSBvbmVzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAkLmVhY2goZmlsdGVyZWQsIGZ1bmN0aW9uKGluZGV4LCBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5hbGxvd0R1cGxpY2F0ZXMgfHwgJC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sIHNlbGVjdGVkVmFsdWVzKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNvcnQgdGhlIGRhdGFcbiAgICAgICAgICAgICAgICBpZihjZmcuc29ydE9yZGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdIDwgYltjZmcuc29ydE9yZGVyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAtMSA6IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdID4gYltjZmcuc29ydE9yZGVyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAxIDogLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRyaW0gaXQgZG93blxuICAgICAgICAgICAgICAgIGlmKGNmZy5tYXhTdWdnZXN0aW9ucyAmJiBjZmcubWF4U3VnZ2VzdGlvbnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gbmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCwgY2ZnLm1heFN1Z2dlc3Rpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ld1N1Z2dlc3Rpb25zO1xuXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfZ3JvdXA6IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgIC8vIGJ1aWxkIGdyb3Vwc1xuICAgICAgICAgICAgICAgIGlmKGNmZy5ncm91cEJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIF9ncm91cHMgPSB7fTtcblxuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcHMgPSBjZmcuZ3JvdXBCeS5pbmRleE9mKCcuJykgPiAtMSA/IGNmZy5ncm91cEJ5LnNwbGl0KCcuJykgOiBjZmcuZ3JvdXBCeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wID0gdmFsdWVbY2ZnLmdyb3VwQnldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKHByb3BzKSAhPSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKHByb3BzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcFtwcm9wcy5zaGlmdCgpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfZ3JvdXBzW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdID0ge3RpdGxlOiBwcm9wLCBpdGVtczogW3ZhbHVlXX07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFVwZGF0ZSB0aGUgaGVscGVyIHRleHRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF91cGRhdGVIZWxwZXI6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaHRtbChodG1sKTtcbiAgICAgICAgICAgICAgICBpZighbXMuaGVscGVyLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmZhZGVJbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmFsaWRhdGUgYW4gaXRlbSBhZ2FpbnN0IHZ0eXBlIG9yIHZyZWdleFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3ZhbGlkYXRlU2luZ2xlSXRlbTogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIGlmKGNmZy52cmVnZXggIT09IG51bGwgJiYgY2ZnLnZyZWdleCBpbnN0YW5jZW9mIFJlZ0V4cCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjZmcudnR5cGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGNmZy52dHlwZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdhbHBoYSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eW2EtekEtWl9dKyQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FscGhhbnVtJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15bYS16QS1aMC05X10rJC8pLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZW1haWwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXihcXHcrKShbXFwtKy5dW1xcd10rKSpAKFxcd1tcXC1cXHddKlxcLil7MSw1fShbQS1aYS16XSl7Miw2fSQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC8oKCheaHR0cHM/KXwoXmZ0cCkpOlxcL1xcLyhbXFwtXFx3XStcXC4pK1xcd3syLDN9KFxcL1slXFwtXFx3XSsoXFwuXFx3ezIsfSk/KSooKFtcXHdcXC1cXC5cXD9cXFxcXFwvK0AmIztgfj0lIV0qKShcXC5cXHd7Mix9KT8pKlxcLz8pL2kpLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaXBhZGRyZXNzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaGFuZGxlcnMgPSB7XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGJsdXJyaW5nIG91dCBvZiB0aGUgY29tcG9uZW50XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25CbHVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ21zLWN0bi1mb2N1cycpO1xuICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgX2hhc0ZvY3VzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYobXMuZ2V0UmF3VmFsdWUoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgICAgICAgICAgICAgIG9ialtjZmcuZGlzcGxheUZpZWxkXSA9IG9ialtjZmcudmFsdWVGaWVsZF0gPSBtcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG5cbiAgICAgICAgICAgICAgICBpZihtcy5pc1ZhbGlkKCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZWxzZSBpZihtcy5pbnB1dC52YWwoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcignJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignYmx1cicsIFttc10pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBob3ZlcmluZyBhbiBlbGVtZW50IGluIHRoZSBjb21ib1xuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbU1vdXNlT3ZlcjogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICAgICAgaWYoIXRhcmdldC5oYXNDbGFzcygnbXMtcmVzLWl0ZW0tZGlzYWJsZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYW4gaXRlbSBpcyBjaG9zZW4gZnJvbSB0aGUgbGlzdFxuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbVNlbGVjdGVkOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgICAgICBpZighdGFyZ2V0Lmhhc0NsYXNzKCdtcy1yZXMtaXRlbS1kaXNhYmxlZCcpKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gZm9jdXNpbmcgb24gdGhlIGNvbnRhaW5lciBkaXYuIFdpbGwgZm9jdXMgb24gdGhlIGlucHV0IGZpZWxkIGluc3RlYWQuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25Gb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgb24gdGhlIGlucHV0IHRleHQgZmllbGRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbklucHV0Q2xpY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgX2hhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcudG9nZ2xlT25DbGljayA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5leHBhbmRlZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGZvY3VzaW5nIG9uIHRoZSBpbnB1dCB0ZXh0IGZpZWxkLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uSW5wdXRGb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhX2hhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIF9oYXNGb2N1cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWZvY3VzJyk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKGN1ckxlbmd0aCA8IGNmZy5taW5DaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignZm9jdXMnLCBbbXNdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSB1c2VyIHByZXNzZXMgYSBrZXkgd2hpbGUgdGhlIGNvbXBvbmVudCBoYXMgZm9jdXNcbiAgICAgICAgICAgICAqIFRoaXMgaXMgd2hlcmUgd2Ugd2FudCB0byBoYW5kbGUgYWxsIGtleXMgdGhhdCBkb24ndCByZXF1aXJlIHRoZSB1c2VyIGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgKiBzaW5jZSBpdCBoYXNuJ3QgcmVnaXN0ZXJlZCB0aGUga2V5IGhpdCB5ZXRcbiAgICAgICAgICAgICAqIEBwYXJhbSBlIGtleUV2ZW50XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25LZXlEb3duOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaG93IHRhYiBzaG91bGQgYmUgaGFuZGxlZFxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmUgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0JyksXG4gICAgICAgICAgICAgICAgICAgIGZyZWVJbnB1dCA9IG1zLmlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleWRvd24nLCBbbXMsIGVdKTtcblxuICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuVEFCICYmIChjZmcudXNlVGFiS2V5ID09PSBmYWxzZSB8fFxuICAgICAgICAgICAgICAgICAgICAoY2ZnLnVzZVRhYktleSA9PT0gdHJ1ZSAmJiBhY3RpdmUubGVuZ3RoID09PSAwICYmIG1zLmlucHV0LnZhbCgpLmxlbmd0aCA9PT0gMCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQkFDS1NQQUNFOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRTZWxlY3Rpb24oKS5sZW5ndGggPiAwICYmIGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24ucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW21zLCBtcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiBtcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVTQzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVOVEVSOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0ICE9PSAnJyB8fCBjZmcuZXhwYW5kZWQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnVzZUNvbW1hS2V5ID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DVFJMOlxuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkRPV05BUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX21vdmVTZWxlY3RlZFJvdyhcImRvd25cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5VUEFSUk9XOlxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBhIGtleSBpcyByZWxlYXNlZCB3aGlsZSB0aGUgY29tcG9uZW50IGhhcyBmb2N1c1xuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbktleVVwOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZyZWVJbnB1dCA9IG1zLmdldFJhd1ZhbHVlKCksXG4gICAgICAgICAgICAgICAgICAgIGlucHV0VmFsaWQgPSAkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICghY2ZnLm1heEVudHJ5TGVuZ3RoIHx8ICQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoIDw9IGNmZy5tYXhFbnRyeUxlbmd0aCksXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLFxuICAgICAgICAgICAgICAgICAgICBvYmogPSB7fTtcblxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleXVwJywgW21zLCBlXSk7XG5cbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RpbWVyKTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbGxhcHNlIGlmIGVzY2FwZSwgYnV0IGtlZXAgZm9jdXMuXG4gICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5FU0MgJiYgY2ZnLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIGEgYnVuY2ggb2Yga2V5c1xuICAgICAgICAgICAgICAgIGlmKChlLmtleUNvZGUgPT09IEtFWUNPREVTLlRBQiAmJiBjZmcudXNlVGFiS2V5ID09PSBmYWxzZSkgfHwgKGUua2V5Q29kZSA+IEtFWUNPREVTLkVOVEVSICYmIGUua2V5Q29kZSA8IEtFWUNPREVTLlNQQUNFKSkge1xuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLkNUUkwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVVBBUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRU5URVI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgIT09IEtFWUNPREVTLkNPTU1BIHx8IGNmZy51c2VDb21tYUtleSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKXsgLy8gaWYgYSBzZWxlY3Rpb24gaXMgcGVyZm9ybWVkLCBzZWxlY3QgaXQgYW5kIHJlc2V0IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VsZWN0ZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIG5vIHNlbGVjdGlvbiBvciBpZiBmcmVldGV4dCBlbnRlcmVkIGFuZCBmcmVlIGVudHJpZXMgYWxsb3dlZCwgYWRkIG5ldyBvYmogdG8gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpbnB1dFZhbGlkID09PSB0cnVlICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2NmZy5kaXNwbGF5RmllbGRdID0gb2JqW2NmZy52YWx1ZUZpZWxkXSA9IGZyZWVJbnB1dC50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpOyAvLyByZXNldCBjb21ibyBzdWdnZXN0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA8IGNmZy5taW5DaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBmcmVlSW5wdXQubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGNmZy5tYXhFbnRyeUxlbmd0aCAmJiBmcmVlSW5wdXQubGVuZ3RoID4gY2ZnLm1heEVudHJ5TGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4RW50cnlSZW5kZXJlci5jYWxsKHRoaXMsIGZyZWVJbnB1dC5sZW5ndGggLSBjZmcubWF4RW50cnlMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcubWluQ2hhcnMgPD0gZnJlZUlucHV0Lmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBjZmcudHlwZURlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgdXBvbiBjcm9zcyBmb3IgZGVsZXRpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25UYWdUcmlnZ2VyQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBtcy5yZW1vdmVGcm9tU2VsZWN0aW9uKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCdqc29uJykpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyBvbiB0aGUgc21hbGwgdHJpZ2dlciBpbiB0aGUgcmlnaHRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vblRyaWdnZXJDbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhKGNmZy5leHBhbmRPbkZvY3VzID09PSB0cnVlICYmIF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCd0cmlnZ2VyY2xpY2snLCBbbXNdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY3VyTGVuZ3RoID49IGNmZy5taW5DaGFycyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSBicm93c2VyIHdpbmRvdyBpcyByZXNpemVkXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25XaW5kb3dSZXNpemVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzdGFydHVwIHBvaW50XG4gICAgICAgIGlmKGVsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNlbGYuX3JlbmRlcihlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmZuLm1hZ2ljU3VnZ2VzdCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG9iaiA9ICQodGhpcyk7XG5cbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSAmJiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0JykpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBvYmouZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAvLyBhc3N1bWUgJCh0aGlzKSBpcyBhbiBlbGVtZW50XG4gICAgICAgICAgICB2YXIgY250ciA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFJldHVybiBlYXJseSBpZiB0aGlzIGVsZW1lbnQgYWxyZWFkeSBoYXMgYSBwbHVnaW4gaW5zdGFuY2VcbiAgICAgICAgICAgIGlmKGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0Jykpe1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0Jyl7IC8vIHJlbmRlcmluZyBmcm9tIHNlbGVjdFxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMudmFsdWUgPSBbXTtcbiAgICAgICAgICAgICAgICAkLmVhY2godGhpcy5jaGlsZHJlbiwgZnVuY3Rpb24oaW5kZXgsIGNoaWxkKXtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2hpbGQubm9kZU5hbWUgJiYgY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ29wdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhLnB1c2goe2lkOiBjaGlsZC52YWx1ZSwgbmFtZTogY2hpbGQudGV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoJChjaGlsZCkuYXR0cignc2VsZWN0ZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZGVmID0ge307XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVzIGZyb20gRE9NIGNvbnRhaW5lciBlbGVtZW50XG4gICAgICAgICAgICAkLmVhY2godGhpcy5hdHRyaWJ1dGVzLCBmdW5jdGlvbihpLCBhdHQpe1xuICAgICAgICAgICAgICAgIGRlZlthdHQubmFtZV0gPSBhdHQubmFtZSA9PT0gJ3ZhbHVlJyAmJiBhdHQudmFsdWUgIT09ICcnID8gSlNPTi5wYXJzZShhdHQudmFsdWUpIDogYXR0LnZhbHVlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBmaWVsZCA9IG5ldyBNYWdpY1N1Z2dlc3QodGhpcywgJC5leHRlbmQoW10sICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLCBvcHRpb25zLCBkZWYpKTtcbiAgICAgICAgICAgIGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0JywgZmllbGQpO1xuICAgICAgICAgICAgZmllbGQuY29udGFpbmVyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcsIGZpZWxkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG5cbiAgICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzID0ge307XG59KShqUXVlcnkpO1xuIl19
