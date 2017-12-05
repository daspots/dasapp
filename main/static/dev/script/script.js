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


$('.grid').masonry({
      itemSelector: '.grid-item', // use a separate class for itemSelector, other than .col-
      columnWidth: '.grid-sizer',
      percentPosition: true
    });
 }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImdpZmZmZXIuanMiLCJsb2FkLmpzIiwibWFzb25yeS5wa2dkLm1pbi5qcyIsInN0YXJfY29kZS5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LW1pbi5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsTUFBTSxDQUFDLFFBQVAsR0FBa0IsU0FBQyxNQUFELEVBQVMsR0FBVCxFQUFjLE1BQWQsRUFBc0IsSUFBdEIsRUFBNEIsUUFBNUI7QUFDaEIsUUFBQTtJQUFBLFFBQUEsR0FBVyxRQUFBLElBQVksSUFBWixJQUFvQjtJQUMvQixJQUFBLEdBQU8sSUFBQSxJQUFRO0lBQ2YsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFvQixDQUF2QjtNQUNFLElBQUEsR0FBTyxPQURUOztJQUVBLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBcUIsQ0FBeEI7TUFDRSxNQUFBLEdBQVM7TUFDVCxJQUFBLEdBQU8sT0FGVDs7SUFHQSxNQUFBLEdBQVMsTUFBQSxJQUFVO0FBQ25CLFNBQUEsV0FBQTs7TUFDRSxJQUF3QixTQUF4QjtRQUFBLE9BQU8sTUFBTyxDQUFBLENBQUEsRUFBZDs7QUFERjtJQUVBLFNBQUEsR0FBZSxHQUFHLENBQUMsTUFBSixDQUFXLEtBQVgsQ0FBQSxJQUFxQixDQUF4QixHQUErQixHQUEvQixHQUF3QztXQUNwRCxDQUFDLENBQUMsSUFBRixDQUNFO01BQUEs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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LmFwaV9jYWxsID0gKG1ldGhvZCwgdXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrKSAtPlxuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGRhdGEgfHwgcGFyYW1zXG4gIGRhdGEgPSBkYXRhIHx8IHBhcmFtc1xuICBpZiBhcmd1bWVudHMubGVuZ3RoID09IDRcbiAgICBkYXRhID0gdW5kZWZpbmVkXG4gIGlmIGFyZ3VtZW50cy5sZW5ndGggPT0gIDNcbiAgICBwYXJhbXMgPSB1bmRlZmluZWRcbiAgICBkYXRhID0gdW5kZWZpbmVkXG4gIHBhcmFtcyA9IHBhcmFtcyB8fCB7fVxuICBmb3IgaywgdiBvZiBwYXJhbXNcbiAgICBkZWxldGUgcGFyYW1zW2tdIGlmIG5vdCB2P1xuICBzZXBhcmF0b3IgPSBpZiB1cmwuc2VhcmNoKCdcXFxcPycpID49IDAgdGhlbiAnJicgZWxzZSAnPydcbiAgJC5hamF4XG4gICAgdHlwZTogbWV0aG9kXG4gICAgdXJsOiBcIiN7dXJsfSN7c2VwYXJhdG9yfSN7JC5wYXJhbSBwYXJhbXN9XCJcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgYWNjZXB0czogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgIGRhdGE6IGlmIGRhdGEgdGhlbiBKU09OLnN0cmluZ2lmeShkYXRhKSBlbHNlIHVuZGVmaW5lZFxuICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgaWYgZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnXG4gICAgICAgIG1vcmUgPSB1bmRlZmluZWRcbiAgICAgICAgaWYgZGF0YS5uZXh0X3VybFxuICAgICAgICAgIG1vcmUgPSAoY2FsbGJhY2spIC0+IGFwaV9jYWxsKG1ldGhvZCwgZGF0YS5uZXh0X3VybCwge30sIGNhbGxiYWNrKVxuICAgICAgICBjYWxsYmFjaz8gdW5kZWZpbmVkLCBkYXRhLnJlc3VsdCwgbW9yZVxuICAgICAgZWxzZVxuICAgICAgICBjYWxsYmFjaz8gZGF0YVxuICAgIGVycm9yOiAoanFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSAtPlxuICAgICAgZXJyb3IgPVxuICAgICAgICBlcnJvcl9jb2RlOiAnYWpheF9lcnJvcidcbiAgICAgICAgdGV4dF9zdGF0dXM6IHRleHRTdGF0dXNcbiAgICAgICAgZXJyb3JfdGhyb3duOiBlcnJvclRocm93blxuICAgICAgICBqcVhIUjoganFYSFJcbiAgICAgIHRyeVxuICAgICAgICBlcnJvciA9ICQucGFyc2VKU09OKGpxWEhSLnJlc3BvbnNlVGV4dCkgaWYganFYSFIucmVzcG9uc2VUZXh0XG4gICAgICBjYXRjaCBlXG4gICAgICAgIGVycm9yID0gZXJyb3JcbiAgICAgIExPRyAnYXBpX2NhbGwgZXJyb3InLCBlcnJvclxuICAgICAgY2FsbGJhY2s/IGVycm9yXG4iLCIoLT5cbiAgY2xhc3Mgd2luZG93LkZpbGVVcGxvYWRlclxuICAgIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMpIC0+XG4gICAgICBAdXBsb2FkX2hhbmRsZXIgPSBAb3B0aW9ucy51cGxvYWRfaGFuZGxlclxuICAgICAgQHNlbGVjdG9yID0gQG9wdGlvbnMuc2VsZWN0b3JcbiAgICAgIEBkcm9wX2FyZWEgPSBAb3B0aW9ucy5kcm9wX2FyZWFcbiAgICAgIEB1cGxvYWRfdXJsID0gQG9wdGlvbnMudXBsb2FkX3VybCBvciBcIi9hcGkvdjEje3dpbmRvdy5sb2NhdGlvbi5wYXRobmFtZX1cIlxuICAgICAgQGNvbmZpcm1fbWVzc2FnZSA9IEBvcHRpb25zLmNvbmZpcm1fbWVzc2FnZSBvciAnRmlsZXMgYXJlIHN0aWxsIGJlaW5nIHVwbG9hZGVkLidcbiAgICAgIEBhbGxvd2VkX3R5cGVzID0gQG9wdGlvbnMuYWxsb3dlZF90eXBlc1xuICAgICAgQG1heF9zaXplID0gQG9wdGlvbnMubWF4X3NpemVcblxuICAgICAgQGFjdGl2ZV9maWxlcyA9IDBcblxuICAgICAgQHNlbGVjdG9yPy5iaW5kICdjaGFuZ2UnLCAoZSkgPT5cbiAgICAgICAgQGZpbGVfc2VsZWN0X2hhbmRsZXIoZSlcblxuICAgICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgIGlmIEBkcm9wX2FyZWE/IGFuZCB4aHIudXBsb2FkXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdvdmVyJywgQGZpbGVfZHJhZ19ob3ZlclxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcmFnbGVhdmUnLCBAZmlsZV9kcmFnX2hvdmVyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2Ryb3AnLCAoZSkgPT5cbiAgICAgICAgICBAZmlsZV9zZWxlY3RfaGFuZGxlciBlXG4gICAgICAgIEBkcm9wX2FyZWEuc2hvdygpXG5cbiAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ID0+XG4gICAgICAgIGlmIEBjb25maXJtX21lc3NhZ2U/IGFuZCBAYWN0aXZlX2ZpbGVzID4gMFxuICAgICAgICAgIHJldHVybiBAY29uZmlybV9tZXNzYWdlXG5cbiAgICBmaWxlX2RyYWdfaG92ZXI6IChlKSA9PlxuICAgICAgaWYgbm90IEBkcm9wX2FyZWE/XG4gICAgICAgIHJldHVyblxuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBpZiBlLnR5cGUgaXMgJ2RyYWdvdmVyJ1xuICAgICAgICBAZHJvcF9hcmVhLmFkZENsYXNzICdkcmFnLWhvdmVyJ1xuICAgICAgZWxzZVxuICAgICAgICBAZHJvcF9hcmVhLnJlbW92ZUNsYXNzICdkcmFnLWhvdmVyJ1xuXG4gICAgZmlsZV9zZWxlY3RfaGFuZGxlcjogKGUpID0+XG4gICAgICBAZmlsZV9kcmFnX2hvdmVyKGUpXG4gICAgICBmaWxlcyA9IGUub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXI/LmZpbGVzIG9yIGUudGFyZ2V0Py5maWxlcyBvciBlLmRhdGFUcmFuc2Zlcj8uZmlsZXNcbiAgICAgIGlmIGZpbGVzPy5sZW5ndGggPiAwXG4gICAgICAgIEB1cGxvYWRfZmlsZXMoZmlsZXMpXG5cbiAgICB1cGxvYWRfZmlsZXM6IChmaWxlcykgPT5cbiAgICAgIEBnZXRfdXBsb2FkX3VybHMgZmlsZXMubGVuZ3RoLCAoZXJyb3IsIHVybHMpID0+XG4gICAgICAgIGlmIGVycm9yXG4gICAgICAgICAgY29uc29sZS5sb2cgJ0Vycm9yIGdldHRpbmcgVVJMcycsIGVycm9yXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIEBwcm9jZXNzX2ZpbGVzIGZpbGVzLCB1cmxzLCAwXG5cbiAgICBnZXRfdXBsb2FkX3VybHM6IChuLCBjYWxsYmFjaykgPT5cbiAgICAgIHJldHVybiBpZiBuIDw9IDBcbiAgICAgIGFwaV9jYWxsICdHRVQnLCBAdXBsb2FkX3VybCwge2NvdW50OiBufSwgKGVycm9yLCByZXN1bHQpIC0+XG4gICAgICAgIGlmIGVycm9yXG4gICAgICAgICAgY2FsbGJhY2sgZXJyb3JcbiAgICAgICAgICB0aHJvdyBlcnJvclxuICAgICAgICBjYWxsYmFjayB1bmRlZmluZWQsIHJlc3VsdFxuXG4gICAgcHJvY2Vzc19maWxlczogKGZpbGVzLCB1cmxzLCBpKSA9PlxuICAgICAgcmV0dXJuIGlmIGkgPj0gZmlsZXMubGVuZ3RoXG4gICAgICBAdXBsb2FkX2ZpbGUgZmlsZXNbaV0sIHVybHNbaV0udXBsb2FkX3VybCwgQHVwbG9hZF9oYW5kbGVyPy5wcmV2aWV3KGZpbGVzW2ldKSwgKCkgPT5cbiAgICAgICAgQHByb2Nlc3NfZmlsZXMgZmlsZXMsIHVybHMsIGkgKyAxLCBAdXBsb2FkX2hhbmRsZXI/XG5cbiAgICB1cGxvYWRfZmlsZTogKGZpbGUsIHVybCwgcHJvZ3Jlc3MsIGNhbGxiYWNrKSA9PlxuICAgICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgIGlmIEBhbGxvd2VkX3R5cGVzPy5sZW5ndGggPiAwXG4gICAgICAgIGlmIGZpbGUudHlwZSBub3QgaW4gQGFsbG93ZWRfdHlwZXNcbiAgICAgICAgICBwcm9ncmVzcyAwLCB1bmRlZmluZWQsICd3cm9uZ190eXBlJ1xuICAgICAgICAgIGNhbGxiYWNrKClcbiAgICAgICAgICByZXR1cm5cblxuICAgICAgaWYgQG1heF9zaXplP1xuICAgICAgICBpZiBmaWxlLnNpemUgPiBAbWF4X3NpemVcbiAgICAgICAgICBwcm9ncmVzcyAwLCB1bmRlZmluZWQsICd0b29fYmlnJ1xuICAgICAgICAgIGNhbGxiYWNrKClcbiAgICAgICAgICByZXR1cm5cblxuICAgICAgIyAkKCcjaW1hZ2UnKS52YWwoZmlsZS5uYW1lKTtcbiAgICAgIHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lciAncHJvZ3Jlc3MnLCAoZXZlbnQpIC0+XG4gICAgICAgIHByb2dyZXNzIHBhcnNlSW50IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsICogMTAwLjBcblxuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IChldmVudCkgPT5cbiAgICAgICAgaWYgeGhyLnJlYWR5U3RhdGUgPT0gNFxuICAgICAgICAgIGlmIHhoci5zdGF0dXMgPT0gMjAwXG4gICAgICAgICAgICByZXNwb25zZSA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dClcbiAgICAgICAgICAgIHByb2dyZXNzIDEwMC4wLCByZXNwb25zZS5yZXN1bHRcbiAgICAgICAgICAgICMgLy8kKCcjY29udGVudCcpLnZhbCh4aHIucmVzcG9uc2VUZXh0KVxuICAgICAgICAgICAgJCgnI2ltYWdlJykudmFsKCQoJyNpbWFnZScpLnZhbCgpICArIHJlc3BvbnNlLnJlc3VsdC5pZCArICc7Jyk7XG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBwcm9ncmVzcyAwLCB1bmRlZmluZWQsICdlcnJvcidcbiAgICAgICAgICAgIEBhY3RpdmVfZmlsZXMgLT0gMVxuXG4gICAgICB4aHIub3BlbiAnUE9TVCcsIHVybCwgdHJ1ZVxuICAgICAgZGF0YSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgICBkYXRhLmFwcGVuZCAnZmlsZScsIGZpbGVcbiAgICAgIHhoci5zZW5kIGRhdGFcbiAgICAgIGNhbGxiYWNrKClcbikoKSIsIndpbmRvdy5MT0cgPSAtPlxuICBjb25zb2xlPy5sb2c/IGFyZ3VtZW50cy4uLlxuXG5cbndpbmRvdy5pbml0X2NvbW1vbiA9IC0+XG4gIGluaXRfbG9hZGluZ19idXR0b24oKVxuICBpbml0X2NvbmZpcm1fYnV0dG9uKClcbiAgaW5pdF9wYXNzd29yZF9zaG93X2J1dHRvbigpXG4gIGluaXRfdGltZSgpXG4gIGluaXRfYW5ub3VuY2VtZW50KClcbiAgaW5pdF9yb3dfbGluaygpXG5cblxud2luZG93LmluaXRfbG9hZGluZ19idXR0b24gPSAtPlxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tbG9hZGluZycsIC0+XG4gICAgJCh0aGlzKS5idXR0b24gJ2xvYWRpbmcnXG5cblxud2luZG93LmluaXRfY29uZmlybV9idXR0b24gPSAtPlxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tY29uZmlybScsIC0+XG4gICAgaWYgbm90IGNvbmZpcm0gJCh0aGlzKS5kYXRhKCdtZXNzYWdlJykgb3IgJ0FyZSB5b3Ugc3VyZT8nXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG5cblxud2luZG93LmluaXRfcGFzc3dvcmRfc2hvd19idXR0b24gPSAtPlxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tcGFzc3dvcmQtc2hvdycsIC0+XG4gICAgJHRhcmdldCA9ICQoJCh0aGlzKS5kYXRhICd0YXJnZXQnKVxuICAgICR0YXJnZXQuZm9jdXMoKVxuICAgIGlmICQodGhpcykuaGFzQ2xhc3MgJ2FjdGl2ZSdcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICdwYXNzd29yZCdcbiAgICBlbHNlXG4gICAgICAkdGFyZ2V0LmF0dHIgJ3R5cGUnLCAndGV4dCdcblxuXG53aW5kb3cuaW5pdF90aW1lID0gLT5cbiAgaWYgJCgndGltZScpLmxlbmd0aCA+IDBcbiAgICByZWNhbGN1bGF0ZSA9IC0+XG4gICAgICAkKCd0aW1lW2RhdGV0aW1lXScpLmVhY2ggLT5cbiAgICAgICAgZGF0ZSA9IG1vbWVudC51dGMgJCh0aGlzKS5hdHRyICdkYXRldGltZSdcbiAgICAgICAgZGlmZiA9IG1vbWVudCgpLmRpZmYgZGF0ZSAsICdkYXlzJ1xuICAgICAgICBpZiBkaWZmID4gMjVcbiAgICAgICAgICAkKHRoaXMpLnRleHQgZGF0ZS5sb2NhbCgpLmZvcm1hdCAnWVlZWS1NTS1ERCdcbiAgICAgICAgZWxzZVxuICAgICAgICAgICQodGhpcykudGV4dCBkYXRlLmZyb21Ob3coKVxuICAgICAgICAkKHRoaXMpLmF0dHIgJ3RpdGxlJywgZGF0ZS5sb2NhbCgpLmZvcm1hdCAnZGRkZCwgTU1NTSBEbyBZWVlZLCBISDptbTpzcyBaJ1xuICAgICAgc2V0VGltZW91dCBhcmd1bWVudHMuY2FsbGVlLCAxMDAwICogNDVcbiAgICByZWNhbGN1bGF0ZSgpXG5cblxud2luZG93LmluaXRfYW5ub3VuY2VtZW50ID0gLT5cbiAgJCgnLmFsZXJ0LWFubm91bmNlbWVudCBidXR0b24uY2xvc2UnKS5jbGljayAtPlxuICAgIHNlc3Npb25TdG9yYWdlPy5zZXRJdGVtICdjbG9zZWRBbm5vdW5jZW1lbnQnLCAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXG5cbiAgaWYgc2Vzc2lvblN0b3JhZ2U/LmdldEl0ZW0oJ2Nsb3NlZEFubm91bmNlbWVudCcpICE9ICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5odG1sKClcbiAgICAkKCcuYWxlcnQtYW5ub3VuY2VtZW50Jykuc2hvdygpXG5cblxud2luZG93LmluaXRfcm93X2xpbmsgPSAtPlxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5yb3ctbGluaycsIC0+XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAkKHRoaXMpLmRhdGEgJ2hyZWYnXG5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcubm90LWxpbmsnLCAoZSkgLT5cbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG5cblxud2luZG93LmNsZWFyX25vdGlmaWNhdGlvbnMgPSAtPlxuICAkKCcjbm90aWZpY2F0aW9ucycpLmVtcHR5KClcblxuXG53aW5kb3cuc2hvd19ub3RpZmljYXRpb24gPSAobWVzc2FnZSwgY2F0ZWdvcnk9J3dhcm5pbmcnKSAtPlxuICBjbGVhcl9ub3RpZmljYXRpb25zKClcbiAgcmV0dXJuIGlmIG5vdCBtZXNzYWdlXG5cbiAgJCgnI25vdGlmaWNhdGlvbnMnKS5hcHBlbmQgXCJcIlwiXG4gICAgICA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtZGlzbWlzc2FibGUgYWxlcnQtI3tjYXRlZ29yeX1cIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjbG9zZVwiIGRhdGEtZGlzbWlzcz1cImFsZXJ0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+JnRpbWVzOzwvYnV0dG9uPlxuICAgICAgICAje21lc3NhZ2V9XG4gICAgICA8L2Rpdj5cbiAgICBcIlwiXCJcblxuXG53aW5kb3cuc2l6ZV9odW1hbiA9IChuYnl0ZXMpIC0+XG4gIGZvciBzdWZmaXggaW4gWydCJywgJ0tCJywgJ01CJywgJ0dCJywgJ1RCJ11cbiAgICBpZiBuYnl0ZXMgPCAxMDAwXG4gICAgICBpZiBzdWZmaXggPT0gJ0InXG4gICAgICAgIHJldHVybiBcIiN7bmJ5dGVzfSAje3N1ZmZpeH1cIlxuICAgICAgcmV0dXJuIFwiI3twYXJzZUludChuYnl0ZXMgKiAxMCkgLyAxMH0gI3tzdWZmaXh9XCJcbiAgICBuYnl0ZXMgLz0gMTAyNC4wXG4iLCIkIC0+XG4gIGluaXRfY29tbW9uKClcblxuJCAtPiAkKCdodG1sLmF1dGgnKS5lYWNoIC0+XG4gIGluaXRfYXV0aCgpXG5cbiQgLT4gJCgnaHRtbC51c2VyLWxpc3QnKS5lYWNoIC0+XG4gIGluaXRfdXNlcl9saXN0KClcblxuJCAtPiAkKCdodG1sLnVzZXItbWVyZ2UnKS5lYWNoIC0+XG4gIGluaXRfdXNlcl9tZXJnZSgpXG5cbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS1saXN0JykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX2xpc3QoKVxuXG4kIC0+ICQoJ2h0bWwucmVzb3VyY2UtdmlldycpLmVhY2ggLT5cbiAgaW5pdF9yZXNvdXJjZV92aWV3KClcblxuJCAtPiAkKCdodG1sLnBvc3QtY3JlYXRlJykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX3VwbG9hZCgpXG5cbiQgLT4gJCgnaHRtbC5yZWNvbW1lbmRlci1jcmVhdGUnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfdXBsb2FkKClcblxuIiwid2luZG93LmluaXRfYXV0aCA9IC0+XG4gICQoJy5yZW1lbWJlcicpLmNoYW5nZSAtPlxuICAgIGJ1dHRvbnMgPSAkKCcuYnRuLXNvY2lhbCcpLnRvQXJyYXkoKS5jb25jYXQgJCgnLmJ0bi1zb2NpYWwtaWNvbicpLnRvQXJyYXkoKVxuICAgIGZvciBidXR0b24gaW4gYnV0dG9uc1xuICAgICAgaHJlZiA9ICQoYnV0dG9uKS5wcm9wICdocmVmJ1xuICAgICAgaWYgJCgnLnJlbWVtYmVyIGlucHV0JykuaXMgJzpjaGVja2VkJ1xuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIFwiI3tocmVmfSZyZW1lbWJlcj10cnVlXCJcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIHRydWVcbiAgICAgIGVsc2VcbiAgICAgICAgJChidXR0b24pLnByb3AgJ2hyZWYnLCBocmVmLnJlcGxhY2UgJyZyZW1lbWJlcj10cnVlJywgJydcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXG5cbiAgJCgnLnJlbWVtYmVyJykuY2hhbmdlKClcbiIsIiMgaHR0cDovL2Jsb2cuYW5vcmdhbi5jb20vMjAxMi8wOS8zMC9wcmV0dHktbXVsdGktZmlsZS11cGxvYWQtYm9vdHN0cmFwLWpxdWVyeS10d2lnLXNpbGV4L1xuaWYgJChcIi5wcmV0dHktZmlsZVwiKS5sZW5ndGhcbiAgJChcIi5wcmV0dHktZmlsZVwiKS5lYWNoICgpIC0+XG4gICAgcHJldHR5X2ZpbGUgPSAkKHRoaXMpXG4gICAgZmlsZV9pbnB1dCA9IHByZXR0eV9maWxlLmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJylcbiAgICBmaWxlX2lucHV0LmhpZGUoKVxuICAgIGZpbGVfaW5wdXQuY2hhbmdlICgpIC0+XG4gICAgICBmaWxlcyA9IGZpbGVfaW5wdXRbMF0uZmlsZXNcbiAgICAgIGluZm8gPSBcIlwiXG4gICAgICBpZiBmaWxlcy5sZW5ndGggPiAxXG4gICAgICAgIGluZm8gPSBcIiN7ZmlsZXMubGVuZ3RofSBmaWxlcyBzZWxlY3RlZFwiXG4gICAgICBlbHNlXG4gICAgICAgIHBhdGggPSBmaWxlX2lucHV0LnZhbCgpLnNwbGl0KFwiXFxcXFwiKVxuICAgICAgICBpbmZvID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdXG4gICAgICBwcmV0dHlfZmlsZS5maW5kKFwiLmlucHV0LWdyb3VwIGlucHV0XCIpLnZhbChpbmZvKVxuICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXBcIikuY2xpY2sgKGUpIC0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIGZpbGVfaW5wdXQuY2xpY2soKVxuICAgICAgJCh0aGlzKS5ibHVyKClcbiIsIndpbmRvdy5pbml0X3Jlc291cmNlX2xpc3QgPSAoKSAtPlxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxuXG53aW5kb3cuaW5pdF9yZXNvdXJjZV92aWV3ID0gKCkgLT5cbiAgaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uKClcblxud2luZG93LmluaXRfcmVzb3VyY2VfdXBsb2FkID0gKCkgLT5cblxuICBpZiB3aW5kb3cuRmlsZSBhbmQgd2luZG93LkZpbGVMaXN0IGFuZCB3aW5kb3cuRmlsZVJlYWRlclxuICAgIHdpbmRvdy5maWxlX3VwbG9hZGVyID0gbmV3IEZpbGVVcGxvYWRlclxuICAgICAgdXBsb2FkX2hhbmRsZXI6IHVwbG9hZF9oYW5kbGVyXG4gICAgICBzZWxlY3RvcjogJCgnLmZpbGUnKVxuICAgICAgZHJvcF9hcmVhOiAkKCcuZHJvcC1hcmVhJylcbiAgICAgIGNvbmZpcm1fbWVzc2FnZTogJ0ZpbGVzIGFyZSBzdGlsbCBiZWluZyB1cGxvYWRlZC4nXG4gICAgICB1cGxvYWRfdXJsOiAkKCcuZmlsZScpLmRhdGEoJ2dldC11cGxvYWQtdXJsJylcbiAgICAgIGFsbG93ZWRfdHlwZXM6IFtdXG4gICAgICBtYXhfc2l6ZTogMTAyNCAqIDEwMjQgKiAxMDI0XG5cbnVwbG9hZF9oYW5kbGVyID1cbiAgcHJldmlldzogKGZpbGUpIC0+XG4gICAgJHJlc291cmNlID0gJCBcIlwiXCJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbC1sZy0yIGNvbC1tZC0zIGNvbC1zbS00IGNvbC14cy02XCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInRodW1ibmFpbFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXZpZXdcIj48L2Rpdj5cbiAgICAgICAgICAgIDxoNT4je2ZpbGUubmFtZX08L2g1PlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1iYXJcIiBzdHlsZT1cIndpZHRoOiAwJTtcIj48L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLXRleHRcIj48L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIFwiXCJcIlxuICAgICRwcmV2aWV3ID0gJCgnLnByZXZpZXcnLCAkcmVzb3VyY2UpXG5cbiAgICBpZiBmaWxlX3VwbG9hZGVyLmFjdGl2ZV9maWxlcyA8IDE2IGFuZCBmaWxlLnR5cGUuaW5kZXhPZihcImltYWdlXCIpIGlzIDBcbiAgICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICAgIHJlYWRlci5vbmxvYWQgPSAoZSkgPT5cbiAgICAgICAgJHByZXZpZXcuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgXCJ1cmwoI3tlLnRhcmdldC5yZXN1bHR9KVwiKVxuICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSlcbiAgICBlbHNlXG4gICAgICAkcHJldmlldy50ZXh0KGZpbGUudHlwZSBvciAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJylcblxuICAgICQoJy5yZXNvdXJjZS11cGxvYWRzJykucHJlcGVuZCgkcmVzb3VyY2UpXG5cbiAgICAocHJvZ3Jlc3MsIHJlc291cmNlLCBlcnJvcikgPT5cbiAgICAgIGlmIGVycm9yXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCAnMTAwJScpXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItZGFuZ2VyJylcbiAgICAgICAgaWYgZXJyb3IgPT0gJ3Rvb19iaWcnXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJGYWlsZWQhIFRvbyBiaWcsIG1heDogI3tzaXplX2h1bWFuKGZpbGVfdXBsb2FkZXIubWF4X3NpemUpfS5cIilcbiAgICAgICAgZWxzZSBpZiBlcnJvciA9PSAnd3JvbmdfdHlwZSdcbiAgICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIkZhaWxlZCEgV3JvbmcgZmlsZSB0eXBlLlwiKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoJ0ZhaWxlZCEnKVxuICAgICAgICByZXR1cm5cblxuICAgICAgaWYgcHJvZ3Jlc3MgPT0gMTAwLjAgYW5kIHJlc291cmNlXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItc3VjY2VzcycpXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiU3VjY2VzcyAje3NpemVfaHVtYW4oZmlsZS5zaXplKX1cIilcbiAgICAgICAgaWYgcmVzb3VyY2UuaW1hZ2VfdXJsIGFuZCAkcHJldmlldy50ZXh0KCkubGVuZ3RoID4gMFxuICAgICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7cmVzb3VyY2UuaW1hZ2VfdXJsfSlcIilcbiAgICAgICAgICAkcHJldmlldy50ZXh0KCcnKVxuICAgICAgZWxzZSBpZiBwcm9ncmVzcyA9PSAxMDAuMFxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIjEwMCUgLSBQcm9jZXNzaW5nLi5cIilcbiAgICAgIGVsc2VcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsIFwiI3twcm9ncmVzc30lXCIpXG4gICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiI3twcm9ncmVzc30lIG9mICN7c2l6ZV9odW1hbihmaWxlLnNpemUpfVwiKVxuXG5cbndpbmRvdy5pbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24gPSAoKSAtPlxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tZGVsZXRlJywgKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgaWYgY29uZmlybSgnUHJlc3MgT0sgdG8gZGVsZXRlIHRoZSByZXNvdXJjZScpXG4gICAgICAkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCAkKHRoaXMpLmRhdGEoJ2FwaS11cmwnKSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICBpZiBlcnJcbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcbiAgICAgICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nIGR1cmluZyBkZWxldGUhJywgZXJyXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIHRhcmdldCA9ICQodGhpcykuZGF0YSgndGFyZ2V0JylcbiAgICAgICAgcmVkaXJlY3RfdXJsID0gJCh0aGlzKS5kYXRhKCdyZWRpcmVjdC11cmwnKVxuICAgICAgICBpZiB0YXJnZXRcbiAgICAgICAgICAkKFwiI3t0YXJnZXR9XCIpLnJlbW92ZSgpXG4gICAgICAgIGlmIHJlZGlyZWN0X3VybFxuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVkaXJlY3RfdXJsIiwid2luZG93LmluaXRfdXNlcl9saXN0ID0gLT5cbiAgaW5pdF91c2VyX3NlbGVjdGlvbnMoKVxuICBpbml0X3VzZXJfZGVsZXRlX2J0bigpXG4gIGluaXRfdXNlcl9tZXJnZV9idG4oKVxuXG5cbmluaXRfdXNlcl9zZWxlY3Rpb25zID0gLT5cbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICB1c2VyX3NlbGVjdF9yb3cgJCh0aGlzKVxuXG4gICQoJyNzZWxlY3QtYWxsJykuY2hhbmdlIC0+XG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnByb3AgJ2NoZWNrZWQnLCAkKHRoaXMpLmlzICc6Y2hlY2tlZCdcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuZWFjaCAtPlxuICAgICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuY2hhbmdlIC0+XG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuXG51c2VyX3NlbGVjdF9yb3cgPSAoJGVsZW1lbnQpIC0+XG4gIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuZWFjaCAtPlxuICAgIGlkID0gJGVsZW1lbnQudmFsKClcbiAgICAkKFwiIyN7aWR9XCIpLnRvZ2dsZUNsYXNzICd3YXJuaW5nJywgJGVsZW1lbnQuaXMgJzpjaGVja2VkJ1xuXG5cbnVwZGF0ZV91c2VyX3NlbGVjdGlvbnMgPSAtPlxuICBzZWxlY3RlZCA9ICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxuICAkKCcjdXNlci1hY3Rpb25zJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkID09IDBcbiAgJCgnI3VzZXItbWVyZ2UnKS50b2dnbGVDbGFzcyAnaGlkZGVuJywgc2VsZWN0ZWQgPCAyXG4gIGlmIHNlbGVjdGVkIGlzIDBcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXG4gIGVsc2UgaWYgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpub3QoOmNoZWNrZWQpJykubGVuZ3RoIGlzIDBcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnY2hlY2tlZCcsIHRydWVcbiAgZWxzZVxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnaW5kZXRlcm1pbmF0ZScsIHRydWVcblxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIERlbGV0ZSBVc2VycyBTdHVmZlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuaW5pdF91c2VyX2RlbGV0ZV9idG4gPSAtPlxuICAkKCcjdXNlci1kZWxldGUnKS5jbGljayAoZSkgLT5cbiAgICBjbGVhcl9ub3RpZmljYXRpb25zKClcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBjb25maXJtX21lc3NhZ2UgPSAoJCh0aGlzKS5kYXRhICdjb25maXJtJykucmVwbGFjZSAne3VzZXJzfScsICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmxlbmd0aFxuICAgIGlmIGNvbmZpcm0gY29uZmlybV9tZXNzYWdlXG4gICAgICB1c2VyX2tleXMgPSBbXVxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykuZWFjaCAtPlxuICAgICAgICAkKHRoaXMpLmF0dHIgJ2Rpc2FibGVkJywgdHJ1ZVxuICAgICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXG4gICAgICBkZWxldGVfdXJsID0gJCh0aGlzKS5kYXRhICdhcGktdXJsJ1xuICAgICAgc3VjY2Vzc19tZXNzYWdlID0gJCh0aGlzKS5kYXRhICdzdWNjZXNzJ1xuICAgICAgZXJyb3JfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnZXJyb3InXG4gICAgICBhcGlfY2FsbCAnREVMRVRFJywgZGVsZXRlX3VybCwge3VzZXJfa2V5czogdXNlcl9rZXlzLmpvaW4oJywnKX0sIChlcnIsIHJlc3VsdCkgLT5cbiAgICAgICAgaWYgZXJyXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpkaXNhYmxlZCcpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIGVycm9yX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnZGFuZ2VyJ1xuICAgICAgICAgIHJldHVyblxuICAgICAgICAkKFwiIyN7cmVzdWx0LmpvaW4oJywgIycpfVwiKS5mYWRlT3V0IC0+XG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKVxuICAgICAgICAgIHVwZGF0ZV91c2VyX3NlbGVjdGlvbnMoKVxuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIHN1Y2Nlc3NfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdzdWNjZXNzJ1xuXG5cbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgTWVyZ2UgVXNlcnMgU3R1ZmZcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbndpbmRvdy5pbml0X3VzZXJfbWVyZ2UgPSAtPlxuICB1c2VyX2tleXMgPSAkKCcjdXNlcl9rZXlzJykudmFsKClcbiAgYXBpX3VybCA9ICQoJy5hcGktdXJsJykuZGF0YSAnYXBpLXVybCdcbiAgYXBpX2NhbGwgJ0dFVCcsIGFwaV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5c30sIChlcnJvciwgcmVzdWx0KSAtPlxuICAgIGlmIGVycm9yXG4gICAgICBMT0cgJ1NvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nJ1xuICAgICAgcmV0dXJuXG4gICAgd2luZG93LnVzZXJfZGJzID0gcmVzdWx0XG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xuXG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5jaGFuZ2UgKGV2ZW50KSAtPlxuICAgIHVzZXJfa2V5ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KS52YWwoKVxuICAgIHNlbGVjdF9kZWZhdWx0X3VzZXIgdXNlcl9rZXlcblxuXG5zZWxlY3RfZGVmYXVsdF91c2VyID0gKHVzZXJfa2V5KSAtPlxuICAkKCcudXNlci1yb3cnKS5yZW1vdmVDbGFzcygnc3VjY2VzcycpLmFkZENsYXNzICdkYW5nZXInXG4gICQoXCIjI3t1c2VyX2tleX1cIikucmVtb3ZlQ2xhc3MoJ2RhbmdlcicpLmFkZENsYXNzICdzdWNjZXNzJ1xuXG4gIGZvciB1c2VyX2RiIGluIHVzZXJfZGJzXG4gICAgaWYgdXNlcl9rZXkgPT0gdXNlcl9kYi5rZXlcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9rZXldJykudmFsIHVzZXJfZGIua2V5XG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJuYW1lXScpLnZhbCB1c2VyX2RiLnVzZXJuYW1lXG4gICAgICAkKCdpbnB1dFtuYW1lPW5hbWVdJykudmFsIHVzZXJfZGIubmFtZVxuICAgICAgJCgnaW5wdXRbbmFtZT1lbWFpbF0nKS52YWwgdXNlcl9kYi5lbWFpbFxuICAgICAgYnJlYWtcblxuXG5pbml0X3VzZXJfbWVyZ2VfYnRuID0gLT5cbiAgJCgnI3VzZXItbWVyZ2UnKS5jbGljayAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICB1c2VyX2tleXMgPSBbXVxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmVhY2ggLT5cbiAgICAgIHVzZXJfa2V5cy5wdXNoICQodGhpcykudmFsKClcbiAgICB1c2VyX21lcmdlX3VybCA9ICQodGhpcykuZGF0YSAndXNlci1tZXJnZS11cmwnXG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBcIiN7dXNlcl9tZXJnZV91cmx9P3VzZXJfa2V5cz0je3VzZXJfa2V5cy5qb2luKCcsJyl9XCJcbiIsIlxuZnVuY3Rpb24gZm9sbG93RnVuY3Rpb24oeCwgeSkge1xuXG4gICAgYXBpX3VybCA9ICcvYXBpL3YxL2ZvbGxvdy8nICsgeSArICcvJztcblxuICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibGFiZWwtZGVmYXVsdFwiKSl7XG4gICAgICAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcIm5vdC1sb2dnZWQtaW5cIikpe1xuLy8gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5jc3Moe1widmlzaWJpbGl0eVwiOlwidmlzaWJsZVwiLFwiZGlzcGxheVwiOlwiYmxvY2tcIn0pO1xuICAgICAgICAgICAgJChcIi5yZWNvbW1lbmRlclwiKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5mYWRlSW4oKTtcbi8vICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVPdXQoKTtcbiAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImxhYmVsLWRlZmF1bHRcIilcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LmFkZChcImxhYmVsLXN1Y2Nlc3NcIilcbiAgICAgICAgICAgIHguaW5uZXJIVE1MPSdGT0xMT1dJTkcnO1xuICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCwgICAgLy9Zb3VyIGFwaSB1cmxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQVVQnLCAgIC8vdHlwZSBpcyBhbnkgSFRUUCBtZXRob2RcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgICAgICAvL0RhdGEgYXMganMgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgIH1cblxuICAgIH0gZWxzZSBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImxhYmVsLXN1Y2Nlc3NcIikpe1xuXG4gICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImxhYmVsLXN1Y2Nlc3NcIilcbiAgICAgICAgeC5jbGFzc0xpc3QuYWRkKFwibGFiZWwtZGVmYXVsdFwiKVxuICAgICAgICB4LmlubmVySFRNTCA9ICdGT0xMT1cnO1xuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgO1xuICAgIH1cblxufVxuXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG4gICQodGhpcykuY2xvc2VzdCgnLmNhcmQnKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICQoXCIucmVjb21tZW5kZXJcIikuZmFkZUluKCk7XG59KSIsIi8vKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsZmFjdG9yeSl7aWYodHlwZW9mIGV4cG9ydHM9PT1cIm9iamVjdFwiJiZ0eXBlb2YgbW9kdWxlPT09XCJvYmplY3RcIiltb2R1bGUuZXhwb3J0cz1mYWN0b3J5KCk7ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kKWRlZmluZShcIkdpZmZmZXJcIixbXSxmYWN0b3J5KTtlbHNlIGlmKHR5cGVvZiBleHBvcnRzPT09XCJvYmplY3RcIilleHBvcnRzW1wiR2lmZmZlclwiXT1mYWN0b3J5KCk7ZWxzZSByb290W1wiR2lmZmZlclwiXT1mYWN0b3J5KCl9KSh0aGlzLGZ1bmN0aW9uKCl7dmFyIGQ9ZG9jdW1lbnQ7dmFyIHBsYXlTaXplPTYwO3ZhciBHaWZmZmVyPWZ1bmN0aW9uKG9wdGlvbnMpe3ZhciBpbWFnZXMsaT0wLGdpZnM9W107aW1hZ2VzPWQucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLWdpZmZmZXJdXCIpO2Zvcig7aTxpbWFnZXMubGVuZ3RoOysraSlwcm9jZXNzKGltYWdlc1tpXSxnaWZzLG9wdGlvbnMpO3JldHVybiBnaWZzfTtmdW5jdGlvbiBmb3JtYXRVbml0KHYpe3JldHVybiB2Kyh2LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MD9cIlwiOlwicHhcIil9ZnVuY3Rpb24gcGFyc2VTdHlsZXMoc3R5bGVzKXt2YXIgc3R5bGVzU3RyPVwiXCI7Zm9yKHByb3AgaW4gc3R5bGVzKXN0eWxlc1N0cis9cHJvcCtcIjpcIitzdHlsZXNbcHJvcF0rXCI7XCI7cmV0dXJuIHN0eWxlc1N0cn1mdW5jdGlvbiBjcmVhdGVDb250YWluZXIodyxoLGVsLGFsdFRleHQsb3B0cyl7dmFyIGFsdDt2YXIgY29uPWQuY3JlYXRlRWxlbWVudChcIkJVVFRPTlwiKTt2YXIgY2xzPWVsLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpO3ZhciBpZD1lbC5nZXRBdHRyaWJ1dGUoXCJpZFwiKTt2YXIgcGxheUJ1dHRvblN0eWxlcz1vcHRzJiZvcHRzLnBsYXlCdXR0b25TdHlsZXM/cGFyc2VTdHlsZXMob3B0cy5wbGF5QnV0dG9uU3R5bGVzKTpbXCJ3aWR0aDpcIitwbGF5U2l6ZStcInB4XCIsXCJoZWlnaHQ6XCIrcGxheVNpemUrXCJweFwiLFwiYm9yZGVyLXJhZGl1czpcIitwbGF5U2l6ZS8yK1wicHhcIixcImJhY2tncm91bmQ6cmdiYSgwLCAwLCAwLCAwLjMpXCIsXCJwb3NpdGlvbjphYnNvbHV0ZVwiLFwidG9wOjUwJVwiLFwibGVmdDo1MCVcIixcIm1hcmdpbjotXCIrcGxheVNpemUvMitcInB4XCJdLmpvaW4oXCI7XCIpO3ZhciBwbGF5QnV0dG9uSWNvblN0eWxlcz1vcHRzJiZvcHRzLnBsYXlCdXR0b25JY29uU3R5bGVzP3BhcnNlU3R5bGVzKG9wdHMucGxheUJ1dHRvbkljb25TdHlsZXMpOltcIndpZHRoOiAwXCIsXCJoZWlnaHQ6IDBcIixcImJvcmRlci10b3A6IDE0cHggc29saWQgdHJhbnNwYXJlbnRcIixcImJvcmRlci1ib3R0b206IDE0cHggc29saWQgdHJhbnNwYXJlbnRcIixcImJvcmRlci1sZWZ0OiAxNHB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC41KVwiLFwicG9zaXRpb246IGFic29sdXRlXCIsXCJsZWZ0OiAyNnB4XCIsXCJ0b3A6IDE2cHhcIl0uam9pbihcIjtcIik7Y2xzP2Nvbi5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLGVsLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpKTpudWxsO2lkP2Nvbi5zZXRBdHRyaWJ1dGUoXCJpZFwiLGVsLmdldEF0dHJpYnV0ZShcImlkXCIpKTpudWxsO2Nvbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwicG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO3BhZGRpbmc6MDtcIik7Y29uLnNldEF0dHJpYnV0ZShcImFyaWEtaGlkZGVuXCIsXCJ0cnVlXCIpO3ZhciBwbGF5PWQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtwbGF5LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCJnaWZmZmVyLXBsYXktYnV0dG9uXCIpO3BsYXkuc2V0QXR0cmlidXRlKFwic3R5bGVcIixwbGF5QnV0dG9uU3R5bGVzKTt2YXIgdHJuZ2w9ZC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO3RybmdsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIscGxheUJ1dHRvbkljb25TdHlsZXMpO3BsYXkuYXBwZW5kQ2hpbGQodHJuZ2wpO2lmKGFsdFRleHQpe2FsdD1kLmNyZWF0ZUVsZW1lbnQoXCJwXCIpO2FsdC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLFwiZ2lmZmZlci1hbHRcIik7YWx0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJib3JkZXI6MDtjbGlwOnJlY3QoMCAwIDAgMCk7aGVpZ2h0OjFweDtvdmVyZmxvdzpoaWRkZW47cGFkZGluZzowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjFweDtcIik7YWx0LmlubmVyVGV4dD1hbHRUZXh0K1wiLCBpbWFnZVwifWNvbi5hcHBlbmRDaGlsZChwbGF5KTtlbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjb24sZWwpO2FsdFRleHQ/Y29uLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGFsdCxjb24ubmV4dFNpYmxpbmcpOm51bGw7cmV0dXJue2M6Y29uLHA6cGxheX19ZnVuY3Rpb24gY2FsY3VsYXRlUGVyY2VudGFnZURpbShlbCx3LGgsd09yaWcsaE9yaWcpe3ZhciBwYXJlbnREaW1XPWVsLnBhcmVudE5vZGUub2Zmc2V0V2lkdGg7dmFyIHBhcmVudERpbUg9ZWwucGFyZW50Tm9kZS5vZmZzZXRIZWlnaHQ7dmFyIHJhdGlvPXdPcmlnL2hPcmlnO2lmKHcudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXt3PXBhcnNlSW50KHcudG9TdHJpbmcoKS5yZXBsYWNlKFwiJVwiLFwiXCIpKTt3PXcvMTAwKnBhcmVudERpbVc7aD13L3JhdGlvfWVsc2UgaWYoaC50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2g9cGFyc2VJbnQoaC50b1N0cmluZygpLnJlcGxhY2UoXCIlXCIsXCJcIikpO2g9aC8xMDAqcGFyZW50RGltVzt3PWgvcmF0aW99cmV0dXJue3c6dyxoOmh9fWZ1bmN0aW9uIHByb2Nlc3MoZWwsZ2lmcyxvcHRpb25zKXt2YXIgdXJsLGNvbixjLHcsaCxkdXJhdGlvbixwbGF5LGdpZixwbGF5aW5nPWZhbHNlLGNjLGlzQyxkdXJhdGlvblRpbWVvdXQsZGltcyxhbHRUZXh0O3VybD1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXJcIik7dz1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItd2lkdGhcIik7aD1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItaGVpZ2h0XCIpO2R1cmF0aW9uPWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci1kdXJhdGlvblwiKTthbHRUZXh0PWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci1hbHRcIik7ZWwuc3R5bGUuZGlzcGxheT1cImJsb2NrXCI7Yz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO2lzQz0hIShjLmdldENvbnRleHQmJmMuZ2V0Q29udGV4dChcIjJkXCIpKTtpZih3JiZoJiZpc0MpY2M9Y3JlYXRlQ29udGFpbmVyKHcsaCxlbCxhbHRUZXh0LG9wdGlvbnMpO2VsLm9ubG9hZD1mdW5jdGlvbigpe2lmKCFpc0MpcmV0dXJuO3c9d3x8ZWwud2lkdGg7aD1ofHxlbC5oZWlnaHQ7aWYoIWNjKWNjPWNyZWF0ZUNvbnRhaW5lcih3LGgsZWwsYWx0VGV4dCxvcHRpb25zKTtjb249Y2MuYztwbGF5PWNjLnA7ZGltcz1jYWxjdWxhdGVQZXJjZW50YWdlRGltKGNvbix3LGgsZWwud2lkdGgsZWwuaGVpZ2h0KTtnaWZzLnB1c2goY29uKTtjb24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsZnVuY3Rpb24oKXtjbGVhclRpbWVvdXQoZHVyYXRpb25UaW1lb3V0KTtpZighcGxheWluZyl7cGxheWluZz10cnVlO2dpZj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiSU1HXCIpO2dpZi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwid2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtcIik7Z2lmLnNldEF0dHJpYnV0ZShcImRhdGEtdXJpXCIsTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjFlNSkrMSk7c2V0VGltZW91dChmdW5jdGlvbigpe2dpZi5zcmM9dXJsfSwwKTtjb24ucmVtb3ZlQ2hpbGQocGxheSk7Y29uLnJlbW92ZUNoaWxkKGMpO2Nvbi5hcHBlbmRDaGlsZChnaWYpO2lmKHBhcnNlSW50KGR1cmF0aW9uKT4wKXtkdXJhdGlvblRpbWVvdXQ9c2V0VGltZW91dChmdW5jdGlvbigpe3BsYXlpbmc9ZmFsc2U7Y29uLmFwcGVuZENoaWxkKHBsYXkpO2Nvbi5yZW1vdmVDaGlsZChnaWYpO2Nvbi5hcHBlbmRDaGlsZChjKTtnaWY9bnVsbH0sZHVyYXRpb24pfX1lbHNle3BsYXlpbmc9ZmFsc2U7Y29uLmFwcGVuZENoaWxkKHBsYXkpO2Nvbi5yZW1vdmVDaGlsZChnaWYpO2Nvbi5hcHBlbmRDaGlsZChjKTtnaWY9bnVsbH19KTtjLndpZHRoPWRpbXMudztjLmhlaWdodD1kaW1zLmg7Yy5nZXRDb250ZXh0KFwiMmRcIikuZHJhd0ltYWdlKGVsLDAsMCxkaW1zLncsZGltcy5oKTtjb24uYXBwZW5kQ2hpbGQoYyk7Y29uLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjt3aWR0aDpcIitkaW1zLncrXCJweDtoZWlnaHQ6XCIrZGltcy5oK1wicHg7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO3BhZGRpbmc6MDtcIik7Yy5zdHlsZS53aWR0aD1cIjEwMCVcIjtjLnN0eWxlLmhlaWdodD1cIjEwMCVcIjtpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCYmaC50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2Nvbi5zdHlsZS53aWR0aD13O2Nvbi5zdHlsZS5oZWlnaHQ9aH1lbHNlIGlmKHcudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9dztjb24uc3R5bGUuaGVpZ2h0PVwiaW5oZXJpdFwifWVsc2UgaWYoaC50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2Nvbi5zdHlsZS53aWR0aD1cImluaGVyaXRcIjtjb24uc3R5bGUuaGVpZ2h0PWh9ZWxzZXtjb24uc3R5bGUud2lkdGg9ZGltcy53K1wicHhcIjtjb24uc3R5bGUuaGVpZ2h0PWRpbXMuaCtcInB4XCJ9fTtlbC5zcmM9dXJsfXJldHVybiBHaWZmZmVyfSk7XG4iLCIvLyBGb2xsb3dpbmcgY29kZSBhZGRzIHR5cGVhaGVhZCBrZXl3b3JkcyB0byBzZWFyY2ggYmFyc1xuXG52YXIga2V5d29yZHMgPSBuZXcgQmxvb2Rob3VuZCh7XG4gICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxuICAgIHF1ZXJ5VG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMud2hpdGVzcGFjZSxcbiAgICBwcmVmZXRjaDoge1xuICAgIHVybDogJy9rZXl3b3JkcycsXG4gICAgZmlsdGVyOiBmdW5jdGlvbihsaXN0KSB7XG4gICAgICByZXR1cm4gJC5tYXAobGlzdCwgZnVuY3Rpb24oY2l0eW5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHsgbmFtZTogY2l0eW5hbWUgfTsgfSk7XG4gICAgfVxuICB9XG5cbn0pO1xuXG5rZXl3b3Jkcy5pbml0aWFsaXplKCk7XG5cbiQoJyNzZWFyY2gnKS50eXBlYWhlYWQobnVsbCwge1xuICAgICBtaW5sZW5ndGg6IDEsXG4gICAgIG5hbWU6ICdrZXl3b3JkcycsXG4gICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcbiAgICAgdmFsdWVLZXk6ICduYW1lJyxcbiAgICAgc291cmNlOiBrZXl3b3Jkcy50dEFkYXB0ZXIoKVxufSk7XG5cbiQoJyNzZWFyY2hfcGFnZScpLnR5cGVhaGVhZChudWxsLCB7XG4gICAgIG1pbmxlbmd0aDogMSxcbiAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgZGlzcGxheUtleTogJ25hbWUnLFxuICAgICB2YWx1ZUtleTogJ25hbWUnLFxuICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXG59KTtcblxuXG5cbiQoJyNrZXl3b3JkcycpLnRhZ3NpbnB1dCh7XG4gICAgY29uZmlybUtleXM6IFsxMywgNDRdLFxuICAgIHR5cGVhaGVhZGpzOiBbe1xuICAgICAgICAgIG1pbkxlbmd0aDogMSxcbiAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG5cbiAgICB9LHtcbiAgICAgICAgbWlubGVuZ3RoOiAxLFxuICAgICAgICBuYW1lOiAna2V5d29yZHMnLFxuICAgICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXG4gICAgICAgIHZhbHVlS2V5OiAnbmFtZScsXG4gICAgICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcbiAgICB9XSxcbiAgICBmcmVlSW5wdXQ6IHRydWUsXG5cbn0pO1xuXG4kKCcjbG9jYXRpb25fa2V5d29yZHMnKS50YWdzaW5wdXQoe1xuICAgIGNvbmZpcm1LZXlzOiBbMTMsIDQ0XSxcbiAgICB0eXBlYWhlYWRqczogW3tcbiAgICAgICAgICBtaW5MZW5ndGg6IDEsXG4gICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuXG4gICAgfSx7XG4gICAgICAgIG1pbmxlbmd0aDogMSxcbiAgICAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgICAgZGlzcGxheUtleTogJ25hbWUnLFxuICAgICAgICB2YWx1ZUtleTogJ25hbWUnLFxuICAgICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXG4gICAgfV0sXG4gICAgZnJlZUlucHV0OiB0cnVlLFxuXG59KTtcblxuJCgnLmRyYWFpa25vcGplJykuY2xpY2soZnVuY3Rpb24gKCkge1xuICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICQoJy5ncmlkJykubWFzb25yeSgnbGF5b3V0Jyk7XG4gIH0sIDEwMCk7XG59KTtcblxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICBHaWZmZmVyKHtcbiAgICAgIHBsYXlCdXR0b25TdHlsZXM6IHtcbiAgICAgICAgJ3dpZHRoJzogJzYwcHgnLFxuICAgICAgICAnaGVpZ2h0JzogJzYwcHgnLFxuICAgICAgICAnYm9yZGVyLXJhZGl1cyc6ICczMHB4JyxcbiAgICAgICAgJ2JhY2tncm91bmQnOiAncmdiYSgwLCAwLCAwLCAwLjMpJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ3RvcCc6ICc1MCUnLFxuICAgICAgICAnbGVmdCc6ICc1MCUnLFxuICAgICAgICAnbWFyZ2luJzogJy0zMHB4IDAgMCAtMzBweCdcbiAgICAgIH0sXG4gICAgICBwbGF5QnV0dG9uSWNvblN0eWxlczoge1xuICAgICAgICAnd2lkdGgnOiAnMCcsXG4gICAgICAgICdoZWlnaHQnOiAnMCcsXG4gICAgICAgICdib3JkZXItdG9wJzogJzE0cHggc29saWQgdHJhbnNwYXJlbnQnLFxuICAgICAgICAnYm9yZGVyLWJvdHRvbSc6ICcxNHB4IHNvbGlkIHRyYW5zcGFyZW50JyxcbiAgICAgICAgJ2JvcmRlci1sZWZ0JzogJzE0cHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwgMC41KScsXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICdsZWZ0JzogJzI2cHgnLFxuICAgICAgICAndG9wJzogJzE2cHgnXG4gICAgICB9XG4gICAgfSk7XG5cblxuJCgnLmdyaWQnKS5tYXNvbnJ5KHtcbiAgICAgIGl0ZW1TZWxlY3RvcjogJy5ncmlkLWl0ZW0nLCAvLyB1c2UgYSBzZXBhcmF0ZSBjbGFzcyBmb3IgaXRlbVNlbGVjdG9yLCBvdGhlciB0aGFuIC5jb2wtXG4gICAgICBjb2x1bW5XaWR0aDogJy5ncmlkLXNpemVyJyxcbiAgICAgIHBlcmNlbnRQb3NpdGlvbjogdHJ1ZVxuICAgIH0pO1xuIH0iLCIvKiFcbiAqIE1hc29ucnkgUEFDS0FHRUQgdjQuMi4wXG4gKiBDYXNjYWRpbmcgZ3JpZCBsYXlvdXQgbGlicmFyeVxuICogaHR0cDovL21hc29ucnkuZGVzYW5kcm8uY29tXG4gKiBNSVQgTGljZW5zZVxuICogYnkgRGF2aWQgRGVTYW5kcm9cbiAqL1xuXG4hZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwianF1ZXJ5LWJyaWRnZXQvanF1ZXJ5LWJyaWRnZXRcIixbXCJqcXVlcnlcIl0sZnVuY3Rpb24oaSl7cmV0dXJuIGUodCxpKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUodCxyZXF1aXJlKFwianF1ZXJ5XCIpKTp0LmpRdWVyeUJyaWRnZXQ9ZSh0LHQualF1ZXJ5KX0od2luZG93LGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gaShpLHIsYSl7ZnVuY3Rpb24gaCh0LGUsbil7dmFyIG8scj1cIiQoKS5cIitpKycoXCInK2UrJ1wiKSc7cmV0dXJuIHQuZWFjaChmdW5jdGlvbih0LGgpe3ZhciB1PWEuZGF0YShoLGkpO2lmKCF1KXJldHVybiB2b2lkIHMoaStcIiBub3QgaW5pdGlhbGl6ZWQuIENhbm5vdCBjYWxsIG1ldGhvZHMsIGkuZS4gXCIrcik7dmFyIGQ9dVtlXTtpZighZHx8XCJfXCI9PWUuY2hhckF0KDApKXJldHVybiB2b2lkIHMocitcIiBpcyBub3QgYSB2YWxpZCBtZXRob2RcIik7dmFyIGw9ZC5hcHBseSh1LG4pO289dm9pZCAwPT09bz9sOm99KSx2b2lkIDAhPT1vP286dH1mdW5jdGlvbiB1KHQsZSl7dC5lYWNoKGZ1bmN0aW9uKHQsbil7dmFyIG89YS5kYXRhKG4saSk7bz8oby5vcHRpb24oZSksby5faW5pdCgpKToobz1uZXcgcihuLGUpLGEuZGF0YShuLGksbykpfSl9YT1hfHxlfHx0LmpRdWVyeSxhJiYoci5wcm90b3R5cGUub3B0aW9ufHwoci5wcm90b3R5cGUub3B0aW9uPWZ1bmN0aW9uKHQpe2EuaXNQbGFpbk9iamVjdCh0KSYmKHRoaXMub3B0aW9ucz1hLmV4dGVuZCghMCx0aGlzLm9wdGlvbnMsdCkpfSksYS5mbltpXT1mdW5jdGlvbih0KXtpZihcInN0cmluZ1wiPT10eXBlb2YgdCl7dmFyIGU9by5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gaCh0aGlzLHQsZSl9cmV0dXJuIHUodGhpcyx0KSx0aGlzfSxuKGEpKX1mdW5jdGlvbiBuKHQpeyF0fHx0JiZ0LmJyaWRnZXR8fCh0LmJyaWRnZXQ9aSl9dmFyIG89QXJyYXkucHJvdG90eXBlLnNsaWNlLHI9dC5jb25zb2xlLHM9XCJ1bmRlZmluZWRcIj09dHlwZW9mIHI/ZnVuY3Rpb24oKXt9OmZ1bmN0aW9uKHQpe3IuZXJyb3IodCl9O3JldHVybiBuKGV8fHQualF1ZXJ5KSxpfSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwiZXYtZW1pdHRlci9ldi1lbWl0dGVyXCIsZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSgpOnQuRXZFbWl0dGVyPWUoKX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz93aW5kb3c6dGhpcyxmdW5jdGlvbigpe2Z1bmN0aW9uIHQoKXt9dmFyIGU9dC5wcm90b3R5cGU7cmV0dXJuIGUub249ZnVuY3Rpb24odCxlKXtpZih0JiZlKXt2YXIgaT10aGlzLl9ldmVudHM9dGhpcy5fZXZlbnRzfHx7fSxuPWlbdF09aVt0XXx8W107cmV0dXJuLTE9PW4uaW5kZXhPZihlKSYmbi5wdXNoKGUpLHRoaXN9fSxlLm9uY2U9ZnVuY3Rpb24odCxlKXtpZih0JiZlKXt0aGlzLm9uKHQsZSk7dmFyIGk9dGhpcy5fb25jZUV2ZW50cz10aGlzLl9vbmNlRXZlbnRzfHx7fSxuPWlbdF09aVt0XXx8e307cmV0dXJuIG5bZV09ITAsdGhpc319LGUub2ZmPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fZXZlbnRzJiZ0aGlzLl9ldmVudHNbdF07aWYoaSYmaS5sZW5ndGgpe3ZhciBuPWkuaW5kZXhPZihlKTtyZXR1cm4tMSE9biYmaS5zcGxpY2UobiwxKSx0aGlzfX0sZS5lbWl0RXZlbnQ9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50c1t0XTtpZihpJiZpLmxlbmd0aCl7dmFyIG49MCxvPWlbbl07ZT1lfHxbXTtmb3IodmFyIHI9dGhpcy5fb25jZUV2ZW50cyYmdGhpcy5fb25jZUV2ZW50c1t0XTtvOyl7dmFyIHM9ciYmcltvXTtzJiYodGhpcy5vZmYodCxvKSxkZWxldGUgcltvXSksby5hcHBseSh0aGlzLGUpLG4rPXM/MDoxLG89aVtuXX1yZXR1cm4gdGhpc319LHR9KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJnZXQtc2l6ZS9nZXQtc2l6ZVwiLFtdLGZ1bmN0aW9uKCl7cmV0dXJuIGUoKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUoKTp0LmdldFNpemU9ZSgpfSh3aW5kb3csZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KHQpe3ZhciBlPXBhcnNlRmxvYXQodCksaT0tMT09dC5pbmRleE9mKFwiJVwiKSYmIWlzTmFOKGUpO3JldHVybiBpJiZlfWZ1bmN0aW9uIGUoKXt9ZnVuY3Rpb24gaSgpe2Zvcih2YXIgdD17d2lkdGg6MCxoZWlnaHQ6MCxpbm5lcldpZHRoOjAsaW5uZXJIZWlnaHQ6MCxvdXRlcldpZHRoOjAsb3V0ZXJIZWlnaHQ6MH0sZT0wO3U+ZTtlKyspe3ZhciBpPWhbZV07dFtpXT0wfXJldHVybiB0fWZ1bmN0aW9uIG4odCl7dmFyIGU9Z2V0Q29tcHV0ZWRTdHlsZSh0KTtyZXR1cm4gZXx8YShcIlN0eWxlIHJldHVybmVkIFwiK2UrXCIuIEFyZSB5b3UgcnVubmluZyB0aGlzIGNvZGUgaW4gYSBoaWRkZW4gaWZyYW1lIG9uIEZpcmVmb3g/IFNlZSBodHRwOi8vYml0Lmx5L2dldHNpemVidWcxXCIpLGV9ZnVuY3Rpb24gbygpe2lmKCFkKXtkPSEwO3ZhciBlPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7ZS5zdHlsZS53aWR0aD1cIjIwMHB4XCIsZS5zdHlsZS5wYWRkaW5nPVwiMXB4IDJweCAzcHggNHB4XCIsZS5zdHlsZS5ib3JkZXJTdHlsZT1cInNvbGlkXCIsZS5zdHlsZS5ib3JkZXJXaWR0aD1cIjFweCAycHggM3B4IDRweFwiLGUuc3R5bGUuYm94U2l6aW5nPVwiYm9yZGVyLWJveFwiO3ZhciBpPWRvY3VtZW50LmJvZHl8fGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtpLmFwcGVuZENoaWxkKGUpO3ZhciBvPW4oZSk7ci5pc0JveFNpemVPdXRlcj1zPTIwMD09dChvLndpZHRoKSxpLnJlbW92ZUNoaWxkKGUpfX1mdW5jdGlvbiByKGUpe2lmKG8oKSxcInN0cmluZ1wiPT10eXBlb2YgZSYmKGU9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlKSksZSYmXCJvYmplY3RcIj09dHlwZW9mIGUmJmUubm9kZVR5cGUpe3ZhciByPW4oZSk7aWYoXCJub25lXCI9PXIuZGlzcGxheSlyZXR1cm4gaSgpO3ZhciBhPXt9O2Eud2lkdGg9ZS5vZmZzZXRXaWR0aCxhLmhlaWdodD1lLm9mZnNldEhlaWdodDtmb3IodmFyIGQ9YS5pc0JvcmRlckJveD1cImJvcmRlci1ib3hcIj09ci5ib3hTaXppbmcsbD0wO3U+bDtsKyspe3ZhciBjPWhbbF0sZj1yW2NdLG09cGFyc2VGbG9hdChmKTthW2NdPWlzTmFOKG0pPzA6bX12YXIgcD1hLnBhZGRpbmdMZWZ0K2EucGFkZGluZ1JpZ2h0LGc9YS5wYWRkaW5nVG9wK2EucGFkZGluZ0JvdHRvbSx5PWEubWFyZ2luTGVmdCthLm1hcmdpblJpZ2h0LHY9YS5tYXJnaW5Ub3ArYS5tYXJnaW5Cb3R0b20sXz1hLmJvcmRlckxlZnRXaWR0aCthLmJvcmRlclJpZ2h0V2lkdGgsej1hLmJvcmRlclRvcFdpZHRoK2EuYm9yZGVyQm90dG9tV2lkdGgsRT1kJiZzLGI9dChyLndpZHRoKTtiIT09ITEmJihhLndpZHRoPWIrKEU/MDpwK18pKTt2YXIgeD10KHIuaGVpZ2h0KTtyZXR1cm4geCE9PSExJiYoYS5oZWlnaHQ9eCsoRT8wOmcreikpLGEuaW5uZXJXaWR0aD1hLndpZHRoLShwK18pLGEuaW5uZXJIZWlnaHQ9YS5oZWlnaHQtKGcreiksYS5vdXRlcldpZHRoPWEud2lkdGgreSxhLm91dGVySGVpZ2h0PWEuaGVpZ2h0K3YsYX19dmFyIHMsYT1cInVuZGVmaW5lZFwiPT10eXBlb2YgY29uc29sZT9lOmZ1bmN0aW9uKHQpe2NvbnNvbGUuZXJyb3IodCl9LGg9W1wicGFkZGluZ0xlZnRcIixcInBhZGRpbmdSaWdodFwiLFwicGFkZGluZ1RvcFwiLFwicGFkZGluZ0JvdHRvbVwiLFwibWFyZ2luTGVmdFwiLFwibWFyZ2luUmlnaHRcIixcIm1hcmdpblRvcFwiLFwibWFyZ2luQm90dG9tXCIsXCJib3JkZXJMZWZ0V2lkdGhcIixcImJvcmRlclJpZ2h0V2lkdGhcIixcImJvcmRlclRvcFdpZHRoXCIsXCJib3JkZXJCb3R0b21XaWR0aFwiXSx1PWgubGVuZ3RoLGQ9ITE7cmV0dXJuIHJ9KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yL21hdGNoZXMtc2VsZWN0b3JcIixlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKCk6dC5tYXRjaGVzU2VsZWN0b3I9ZSgpfSh3aW5kb3csZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjt2YXIgdD1mdW5jdGlvbigpe3ZhciB0PXdpbmRvdy5FbGVtZW50LnByb3RvdHlwZTtpZih0Lm1hdGNoZXMpcmV0dXJuXCJtYXRjaGVzXCI7aWYodC5tYXRjaGVzU2VsZWN0b3IpcmV0dXJuXCJtYXRjaGVzU2VsZWN0b3JcIjtmb3IodmFyIGU9W1wid2Via2l0XCIsXCJtb3pcIixcIm1zXCIsXCJvXCJdLGk9MDtpPGUubGVuZ3RoO2krKyl7dmFyIG49ZVtpXSxvPW4rXCJNYXRjaGVzU2VsZWN0b3JcIjtpZih0W29dKXJldHVybiBvfX0oKTtyZXR1cm4gZnVuY3Rpb24oZSxpKXtyZXR1cm4gZVt0XShpKX19KSxmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJmaXp6eS11aS11dGlscy91dGlsc1wiLFtcImRlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3IvbWF0Y2hlcy1zZWxlY3RvclwiXSxmdW5jdGlvbihpKXtyZXR1cm4gZSh0LGkpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSh0LHJlcXVpcmUoXCJkZXNhbmRyby1tYXRjaGVzLXNlbGVjdG9yXCIpKTp0LmZpenp5VUlVdGlscz1lKHQsdC5tYXRjaGVzU2VsZWN0b3IpfSh3aW5kb3csZnVuY3Rpb24odCxlKXt2YXIgaT17fTtpLmV4dGVuZD1mdW5jdGlvbih0LGUpe2Zvcih2YXIgaSBpbiBlKXRbaV09ZVtpXTtyZXR1cm4gdH0saS5tb2R1bG89ZnVuY3Rpb24odCxlKXtyZXR1cm4odCVlK2UpJWV9LGkubWFrZUFycmF5PWZ1bmN0aW9uKHQpe3ZhciBlPVtdO2lmKEFycmF5LmlzQXJyYXkodCkpZT10O2Vsc2UgaWYodCYmXCJvYmplY3RcIj09dHlwZW9mIHQmJlwibnVtYmVyXCI9PXR5cGVvZiB0Lmxlbmd0aClmb3IodmFyIGk9MDtpPHQubGVuZ3RoO2krKyllLnB1c2godFtpXSk7ZWxzZSBlLnB1c2godCk7cmV0dXJuIGV9LGkucmVtb3ZlRnJvbT1mdW5jdGlvbih0LGUpe3ZhciBpPXQuaW5kZXhPZihlKTstMSE9aSYmdC5zcGxpY2UoaSwxKX0saS5nZXRQYXJlbnQ9ZnVuY3Rpb24odCxpKXtmb3IoO3QhPWRvY3VtZW50LmJvZHk7KWlmKHQ9dC5wYXJlbnROb2RlLGUodCxpKSlyZXR1cm4gdH0saS5nZXRRdWVyeUVsZW1lbnQ9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHQ/ZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0KTp0fSxpLmhhbmRsZUV2ZW50PWZ1bmN0aW9uKHQpe3ZhciBlPVwib25cIit0LnR5cGU7dGhpc1tlXSYmdGhpc1tlXSh0KX0saS5maWx0ZXJGaW5kRWxlbWVudHM9ZnVuY3Rpb24odCxuKXt0PWkubWFrZUFycmF5KHQpO3ZhciBvPVtdO3JldHVybiB0LmZvckVhY2goZnVuY3Rpb24odCl7aWYodCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KXtpZighbilyZXR1cm4gdm9pZCBvLnB1c2godCk7ZSh0LG4pJiZvLnB1c2godCk7Zm9yKHZhciBpPXQucXVlcnlTZWxlY3RvckFsbChuKSxyPTA7cjxpLmxlbmd0aDtyKyspby5wdXNoKGlbcl0pfX0pLG99LGkuZGVib3VuY2VNZXRob2Q9ZnVuY3Rpb24odCxlLGkpe3ZhciBuPXQucHJvdG90eXBlW2VdLG89ZStcIlRpbWVvdXRcIjt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbigpe3ZhciB0PXRoaXNbb107dCYmY2xlYXJUaW1lb3V0KHQpO3ZhciBlPWFyZ3VtZW50cyxyPXRoaXM7dGhpc1tvXT1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7bi5hcHBseShyLGUpLGRlbGV0ZSByW29dfSxpfHwxMDApfX0saS5kb2NSZWFkeT1mdW5jdGlvbih0KXt2YXIgZT1kb2N1bWVudC5yZWFkeVN0YXRlO1wiY29tcGxldGVcIj09ZXx8XCJpbnRlcmFjdGl2ZVwiPT1lP3NldFRpbWVvdXQodCk6ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIix0KX0saS50b0Rhc2hlZD1mdW5jdGlvbih0KXtyZXR1cm4gdC5yZXBsYWNlKC8oLikoW0EtWl0pL2csZnVuY3Rpb24odCxlLGkpe3JldHVybiBlK1wiLVwiK2l9KS50b0xvd2VyQ2FzZSgpfTt2YXIgbj10LmNvbnNvbGU7cmV0dXJuIGkuaHRtbEluaXQ9ZnVuY3Rpb24oZSxvKXtpLmRvY1JlYWR5KGZ1bmN0aW9uKCl7dmFyIHI9aS50b0Rhc2hlZChvKSxzPVwiZGF0YS1cIityLGE9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIltcIitzK1wiXVwiKSxoPWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuanMtXCIrciksdT1pLm1ha2VBcnJheShhKS5jb25jYXQoaS5tYWtlQXJyYXkoaCkpLGQ9cytcIi1vcHRpb25zXCIsbD10LmpRdWVyeTt1LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIGkscj10LmdldEF0dHJpYnV0ZShzKXx8dC5nZXRBdHRyaWJ1dGUoZCk7dHJ5e2k9ciYmSlNPTi5wYXJzZShyKX1jYXRjaChhKXtyZXR1cm4gdm9pZChuJiZuLmVycm9yKFwiRXJyb3IgcGFyc2luZyBcIitzK1wiIG9uIFwiK3QuY2xhc3NOYW1lK1wiOiBcIithKSl9dmFyIGg9bmV3IGUodCxpKTtsJiZsLmRhdGEodCxvLGgpfSl9KX0saX0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcIm91dGxheWVyL2l0ZW1cIixbXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixcImdldC1zaXplL2dldC1zaXplXCJdLGUpOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUocmVxdWlyZShcImV2LWVtaXR0ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpKToodC5PdXRsYXllcj17fSx0Lk91dGxheWVyLkl0ZW09ZSh0LkV2RW1pdHRlcix0LmdldFNpemUpKX0od2luZG93LGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gaSh0KXtmb3IodmFyIGUgaW4gdClyZXR1cm4hMTtyZXR1cm4gZT1udWxsLCEwfWZ1bmN0aW9uIG4odCxlKXt0JiYodGhpcy5lbGVtZW50PXQsdGhpcy5sYXlvdXQ9ZSx0aGlzLnBvc2l0aW9uPXt4OjAseTowfSx0aGlzLl9jcmVhdGUoKSl9ZnVuY3Rpb24gbyh0KXtyZXR1cm4gdC5yZXBsYWNlKC8oW0EtWl0pL2csZnVuY3Rpb24odCl7cmV0dXJuXCItXCIrdC50b0xvd2VyQ2FzZSgpfSl9dmFyIHI9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLHM9XCJzdHJpbmdcIj09dHlwZW9mIHIudHJhbnNpdGlvbj9cInRyYW5zaXRpb25cIjpcIldlYmtpdFRyYW5zaXRpb25cIixhPVwic3RyaW5nXCI9PXR5cGVvZiByLnRyYW5zZm9ybT9cInRyYW5zZm9ybVwiOlwiV2Via2l0VHJhbnNmb3JtXCIsaD17V2Via2l0VHJhbnNpdGlvbjpcIndlYmtpdFRyYW5zaXRpb25FbmRcIix0cmFuc2l0aW9uOlwidHJhbnNpdGlvbmVuZFwifVtzXSx1PXt0cmFuc2Zvcm06YSx0cmFuc2l0aW9uOnMsdHJhbnNpdGlvbkR1cmF0aW9uOnMrXCJEdXJhdGlvblwiLHRyYW5zaXRpb25Qcm9wZXJ0eTpzK1wiUHJvcGVydHlcIix0cmFuc2l0aW9uRGVsYXk6cytcIkRlbGF5XCJ9LGQ9bi5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZSh0LnByb3RvdHlwZSk7ZC5jb25zdHJ1Y3Rvcj1uLGQuX2NyZWF0ZT1mdW5jdGlvbigpe3RoaXMuX3RyYW5zbj17aW5nUHJvcGVydGllczp7fSxjbGVhbjp7fSxvbkVuZDp7fX0sdGhpcy5jc3Moe3Bvc2l0aW9uOlwiYWJzb2x1dGVcIn0pfSxkLmhhbmRsZUV2ZW50PWZ1bmN0aW9uKHQpe3ZhciBlPVwib25cIit0LnR5cGU7dGhpc1tlXSYmdGhpc1tlXSh0KX0sZC5nZXRTaXplPWZ1bmN0aW9uKCl7dGhpcy5zaXplPWUodGhpcy5lbGVtZW50KX0sZC5jc3M9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5lbGVtZW50LnN0eWxlO2Zvcih2YXIgaSBpbiB0KXt2YXIgbj11W2ldfHxpO2Vbbl09dFtpXX19LGQuZ2V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgdD1nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWxlbWVudCksZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxpPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIiksbj10W2U/XCJsZWZ0XCI6XCJyaWdodFwiXSxvPXRbaT9cInRvcFwiOlwiYm90dG9tXCJdLHI9dGhpcy5sYXlvdXQuc2l6ZSxzPS0xIT1uLmluZGV4T2YoXCIlXCIpP3BhcnNlRmxvYXQobikvMTAwKnIud2lkdGg6cGFyc2VJbnQobiwxMCksYT0tMSE9by5pbmRleE9mKFwiJVwiKT9wYXJzZUZsb2F0KG8pLzEwMCpyLmhlaWdodDpwYXJzZUludChvLDEwKTtzPWlzTmFOKHMpPzA6cyxhPWlzTmFOKGEpPzA6YSxzLT1lP3IucGFkZGluZ0xlZnQ6ci5wYWRkaW5nUmlnaHQsYS09aT9yLnBhZGRpbmdUb3A6ci5wYWRkaW5nQm90dG9tLHRoaXMucG9zaXRpb24ueD1zLHRoaXMucG9zaXRpb24ueT1hfSxkLmxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5sYXlvdXQuc2l6ZSxlPXt9LGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIiksbj10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpLG89aT9cInBhZGRpbmdMZWZ0XCI6XCJwYWRkaW5nUmlnaHRcIixyPWk/XCJsZWZ0XCI6XCJyaWdodFwiLHM9aT9cInJpZ2h0XCI6XCJsZWZ0XCIsYT10aGlzLnBvc2l0aW9uLngrdFtvXTtlW3JdPXRoaXMuZ2V0WFZhbHVlKGEpLGVbc109XCJcIjt2YXIgaD1uP1wicGFkZGluZ1RvcFwiOlwicGFkZGluZ0JvdHRvbVwiLHU9bj9cInRvcFwiOlwiYm90dG9tXCIsZD1uP1wiYm90dG9tXCI6XCJ0b3BcIixsPXRoaXMucG9zaXRpb24ueSt0W2hdO2VbdV09dGhpcy5nZXRZVmFsdWUobCksZVtkXT1cIlwiLHRoaXMuY3NzKGUpLHRoaXMuZW1pdEV2ZW50KFwibGF5b3V0XCIsW3RoaXNdKX0sZC5nZXRYVmFsdWU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcImhvcml6b250YWxcIik7cmV0dXJuIHRoaXMubGF5b3V0Lm9wdGlvbnMucGVyY2VudFBvc2l0aW9uJiYhZT90L3RoaXMubGF5b3V0LnNpemUud2lkdGgqMTAwK1wiJVwiOnQrXCJweFwifSxkLmdldFlWYWx1ZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwiaG9yaXpvbnRhbFwiKTtyZXR1cm4gdGhpcy5sYXlvdXQub3B0aW9ucy5wZXJjZW50UG9zaXRpb24mJmU/dC90aGlzLmxheW91dC5zaXplLmhlaWdodCoxMDArXCIlXCI6dCtcInB4XCJ9LGQuX3RyYW5zaXRpb25Ubz1mdW5jdGlvbih0LGUpe3RoaXMuZ2V0UG9zaXRpb24oKTt2YXIgaT10aGlzLnBvc2l0aW9uLngsbj10aGlzLnBvc2l0aW9uLnksbz1wYXJzZUludCh0LDEwKSxyPXBhcnNlSW50KGUsMTApLHM9bz09PXRoaXMucG9zaXRpb24ueCYmcj09PXRoaXMucG9zaXRpb24ueTtpZih0aGlzLnNldFBvc2l0aW9uKHQsZSkscyYmIXRoaXMuaXNUcmFuc2l0aW9uaW5nKXJldHVybiB2b2lkIHRoaXMubGF5b3V0UG9zaXRpb24oKTt2YXIgYT10LWksaD1lLW4sdT17fTt1LnRyYW5zZm9ybT10aGlzLmdldFRyYW5zbGF0ZShhLGgpLHRoaXMudHJhbnNpdGlvbih7dG86dSxvblRyYW5zaXRpb25FbmQ6e3RyYW5zZm9ybTp0aGlzLmxheW91dFBvc2l0aW9ufSxpc0NsZWFuaW5nOiEwfSl9LGQuZ2V0VHJhbnNsYXRlPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpbkxlZnRcIiksbj10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpO3JldHVybiB0PWk/dDotdCxlPW4/ZTotZSxcInRyYW5zbGF0ZTNkKFwiK3QrXCJweCwgXCIrZStcInB4LCAwKVwifSxkLmdvVG89ZnVuY3Rpb24odCxlKXt0aGlzLnNldFBvc2l0aW9uKHQsZSksdGhpcy5sYXlvdXRQb3NpdGlvbigpfSxkLm1vdmVUbz1kLl90cmFuc2l0aW9uVG8sZC5zZXRQb3NpdGlvbj1mdW5jdGlvbih0LGUpe3RoaXMucG9zaXRpb24ueD1wYXJzZUludCh0LDEwKSx0aGlzLnBvc2l0aW9uLnk9cGFyc2VJbnQoZSwxMCl9LGQuX25vblRyYW5zaXRpb249ZnVuY3Rpb24odCl7dGhpcy5jc3ModC50byksdC5pc0NsZWFuaW5nJiZ0aGlzLl9yZW1vdmVTdHlsZXModC50byk7Zm9yKHZhciBlIGluIHQub25UcmFuc2l0aW9uRW5kKXQub25UcmFuc2l0aW9uRW5kW2VdLmNhbGwodGhpcyl9LGQudHJhbnNpdGlvbj1mdW5jdGlvbih0KXtpZighcGFyc2VGbG9hdCh0aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbikpcmV0dXJuIHZvaWQgdGhpcy5fbm9uVHJhbnNpdGlvbih0KTt2YXIgZT10aGlzLl90cmFuc247Zm9yKHZhciBpIGluIHQub25UcmFuc2l0aW9uRW5kKWUub25FbmRbaV09dC5vblRyYW5zaXRpb25FbmRbaV07Zm9yKGkgaW4gdC50byllLmluZ1Byb3BlcnRpZXNbaV09ITAsdC5pc0NsZWFuaW5nJiYoZS5jbGVhbltpXT0hMCk7aWYodC5mcm9tKXt0aGlzLmNzcyh0LmZyb20pO3ZhciBuPXRoaXMuZWxlbWVudC5vZmZzZXRIZWlnaHQ7bj1udWxsfXRoaXMuZW5hYmxlVHJhbnNpdGlvbih0LnRvKSx0aGlzLmNzcyh0LnRvKSx0aGlzLmlzVHJhbnNpdGlvbmluZz0hMH07dmFyIGw9XCJvcGFjaXR5LFwiK28oYSk7ZC5lbmFibGVUcmFuc2l0aW9uPWZ1bmN0aW9uKCl7aWYoIXRoaXMuaXNUcmFuc2l0aW9uaW5nKXt2YXIgdD10aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbjt0PVwibnVtYmVyXCI9PXR5cGVvZiB0P3QrXCJtc1wiOnQsdGhpcy5jc3Moe3RyYW5zaXRpb25Qcm9wZXJ0eTpsLHRyYW5zaXRpb25EdXJhdGlvbjp0LHRyYW5zaXRpb25EZWxheTp0aGlzLnN0YWdnZXJEZWxheXx8MH0pLHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGgsdGhpcywhMSl9fSxkLm9ud2Via2l0VHJhbnNpdGlvbkVuZD1mdW5jdGlvbih0KXt0aGlzLm9udHJhbnNpdGlvbmVuZCh0KX0sZC5vbm90cmFuc2l0aW9uZW5kPWZ1bmN0aW9uKHQpe3RoaXMub250cmFuc2l0aW9uZW5kKHQpfTt2YXIgYz17XCItd2Via2l0LXRyYW5zZm9ybVwiOlwidHJhbnNmb3JtXCJ9O2Qub250cmFuc2l0aW9uZW5kPWZ1bmN0aW9uKHQpe2lmKHQudGFyZ2V0PT09dGhpcy5lbGVtZW50KXt2YXIgZT10aGlzLl90cmFuc24sbj1jW3QucHJvcGVydHlOYW1lXXx8dC5wcm9wZXJ0eU5hbWU7aWYoZGVsZXRlIGUuaW5nUHJvcGVydGllc1tuXSxpKGUuaW5nUHJvcGVydGllcykmJnRoaXMuZGlzYWJsZVRyYW5zaXRpb24oKSxuIGluIGUuY2xlYW4mJih0aGlzLmVsZW1lbnQuc3R5bGVbdC5wcm9wZXJ0eU5hbWVdPVwiXCIsZGVsZXRlIGUuY2xlYW5bbl0pLG4gaW4gZS5vbkVuZCl7dmFyIG89ZS5vbkVuZFtuXTtvLmNhbGwodGhpcyksZGVsZXRlIGUub25FbmRbbl19dGhpcy5lbWl0RXZlbnQoXCJ0cmFuc2l0aW9uRW5kXCIsW3RoaXNdKX19LGQuZGlzYWJsZVRyYW5zaXRpb249ZnVuY3Rpb24oKXt0aGlzLnJlbW92ZVRyYW5zaXRpb25TdHlsZXMoKSx0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihoLHRoaXMsITEpLHRoaXMuaXNUcmFuc2l0aW9uaW5nPSExfSxkLl9yZW1vdmVTdHlsZXM9ZnVuY3Rpb24odCl7dmFyIGU9e307Zm9yKHZhciBpIGluIHQpZVtpXT1cIlwiO3RoaXMuY3NzKGUpfTt2YXIgZj17dHJhbnNpdGlvblByb3BlcnR5OlwiXCIsdHJhbnNpdGlvbkR1cmF0aW9uOlwiXCIsdHJhbnNpdGlvbkRlbGF5OlwiXCJ9O3JldHVybiBkLnJlbW92ZVRyYW5zaXRpb25TdHlsZXM9ZnVuY3Rpb24oKXt0aGlzLmNzcyhmKX0sZC5zdGFnZ2VyPWZ1bmN0aW9uKHQpe3Q9aXNOYU4odCk/MDp0LHRoaXMuc3RhZ2dlckRlbGF5PXQrXCJtc1wifSxkLnJlbW92ZUVsZW09ZnVuY3Rpb24oKXt0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpLHRoaXMuY3NzKHtkaXNwbGF5OlwiXCJ9KSx0aGlzLmVtaXRFdmVudChcInJlbW92ZVwiLFt0aGlzXSl9LGQucmVtb3ZlPWZ1bmN0aW9uKCl7cmV0dXJuIHMmJnBhcnNlRmxvYXQodGhpcy5sYXlvdXQub3B0aW9ucy50cmFuc2l0aW9uRHVyYXRpb24pPyh0aGlzLm9uY2UoXCJ0cmFuc2l0aW9uRW5kXCIsZnVuY3Rpb24oKXt0aGlzLnJlbW92ZUVsZW0oKX0pLHZvaWQgdGhpcy5oaWRlKCkpOnZvaWQgdGhpcy5yZW1vdmVFbGVtKCl9LGQucmV2ZWFsPWZ1bmN0aW9uKCl7ZGVsZXRlIHRoaXMuaXNIaWRkZW4sdGhpcy5jc3Moe2Rpc3BsYXk6XCJcIn0pO3ZhciB0PXRoaXMubGF5b3V0Lm9wdGlvbnMsZT17fSxpPXRoaXMuZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eShcInZpc2libGVTdHlsZVwiKTtlW2ldPXRoaXMub25SZXZlYWxUcmFuc2l0aW9uRW5kLHRoaXMudHJhbnNpdGlvbih7ZnJvbTp0LmhpZGRlblN0eWxlLHRvOnQudmlzaWJsZVN0eWxlLGlzQ2xlYW5pbmc6ITAsb25UcmFuc2l0aW9uRW5kOmV9KX0sZC5vblJldmVhbFRyYW5zaXRpb25FbmQ9ZnVuY3Rpb24oKXt0aGlzLmlzSGlkZGVufHx0aGlzLmVtaXRFdmVudChcInJldmVhbFwiKX0sZC5nZXRIaWRlUmV2ZWFsVHJhbnNpdGlvbkVuZFByb3BlcnR5PWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMubGF5b3V0Lm9wdGlvbnNbdF07aWYoZS5vcGFjaXR5KXJldHVyblwib3BhY2l0eVwiO2Zvcih2YXIgaSBpbiBlKXJldHVybiBpfSxkLmhpZGU9ZnVuY3Rpb24oKXt0aGlzLmlzSGlkZGVuPSEwLHRoaXMuY3NzKHtkaXNwbGF5OlwiXCJ9KTt2YXIgdD10aGlzLmxheW91dC5vcHRpb25zLGU9e30saT10aGlzLmdldEhpZGVSZXZlYWxUcmFuc2l0aW9uRW5kUHJvcGVydHkoXCJoaWRkZW5TdHlsZVwiKTtlW2ldPXRoaXMub25IaWRlVHJhbnNpdGlvbkVuZCx0aGlzLnRyYW5zaXRpb24oe2Zyb206dC52aXNpYmxlU3R5bGUsdG86dC5oaWRkZW5TdHlsZSxpc0NsZWFuaW5nOiEwLG9uVHJhbnNpdGlvbkVuZDplfSl9LGQub25IaWRlVHJhbnNpdGlvbkVuZD1mdW5jdGlvbigpe3RoaXMuaXNIaWRkZW4mJih0aGlzLmNzcyh7ZGlzcGxheTpcIm5vbmVcIn0pLHRoaXMuZW1pdEV2ZW50KFwiaGlkZVwiKSl9LGQuZGVzdHJveT1mdW5jdGlvbigpe3RoaXMuY3NzKHtwb3NpdGlvbjpcIlwiLGxlZnQ6XCJcIixyaWdodDpcIlwiLHRvcDpcIlwiLGJvdHRvbTpcIlwiLHRyYW5zaXRpb246XCJcIix0cmFuc2Zvcm06XCJcIn0pfSxufSksZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwib3V0bGF5ZXIvb3V0bGF5ZXJcIixbXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixcImdldC1zaXplL2dldC1zaXplXCIsXCJmaXp6eS11aS11dGlscy91dGlsc1wiLFwiLi9pdGVtXCJdLGZ1bmN0aW9uKGksbixvLHIpe3JldHVybiBlKHQsaSxuLG8scil9KTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHQscmVxdWlyZShcImV2LWVtaXR0ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpLHJlcXVpcmUoXCJmaXp6eS11aS11dGlsc1wiKSxyZXF1aXJlKFwiLi9pdGVtXCIpKTp0Lk91dGxheWVyPWUodCx0LkV2RW1pdHRlcix0LmdldFNpemUsdC5maXp6eVVJVXRpbHMsdC5PdXRsYXllci5JdGVtKX0od2luZG93LGZ1bmN0aW9uKHQsZSxpLG4sbyl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gcih0LGUpe3ZhciBpPW4uZ2V0UXVlcnlFbGVtZW50KHQpO2lmKCFpKXJldHVybiB2b2lkKGgmJmguZXJyb3IoXCJCYWQgZWxlbWVudCBmb3IgXCIrdGhpcy5jb25zdHJ1Y3Rvci5uYW1lc3BhY2UrXCI6IFwiKyhpfHx0KSkpO3RoaXMuZWxlbWVudD1pLHUmJih0aGlzLiRlbGVtZW50PXUodGhpcy5lbGVtZW50KSksdGhpcy5vcHRpb25zPW4uZXh0ZW5kKHt9LHRoaXMuY29uc3RydWN0b3IuZGVmYXVsdHMpLHRoaXMub3B0aW9uKGUpO3ZhciBvPSsrbDt0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEPW8sY1tvXT10aGlzLHRoaXMuX2NyZWF0ZSgpO3ZhciByPXRoaXMuX2dldE9wdGlvbihcImluaXRMYXlvdXRcIik7ciYmdGhpcy5sYXlvdXQoKX1mdW5jdGlvbiBzKHQpe2Z1bmN0aW9uIGUoKXt0LmFwcGx5KHRoaXMsYXJndW1lbnRzKX1yZXR1cm4gZS5wcm90b3R5cGU9T2JqZWN0LmNyZWF0ZSh0LnByb3RvdHlwZSksZS5wcm90b3R5cGUuY29uc3RydWN0b3I9ZSxlfWZ1bmN0aW9uIGEodCl7aWYoXCJudW1iZXJcIj09dHlwZW9mIHQpcmV0dXJuIHQ7dmFyIGU9dC5tYXRjaCgvKF5cXGQqXFwuP1xcZCopKFxcdyopLyksaT1lJiZlWzFdLG49ZSYmZVsyXTtpZighaS5sZW5ndGgpcmV0dXJuIDA7aT1wYXJzZUZsb2F0KGkpO3ZhciBvPW1bbl18fDE7cmV0dXJuIGkqb312YXIgaD10LmNvbnNvbGUsdT10LmpRdWVyeSxkPWZ1bmN0aW9uKCl7fSxsPTAsYz17fTtyLm5hbWVzcGFjZT1cIm91dGxheWVyXCIsci5JdGVtPW8sci5kZWZhdWx0cz17Y29udGFpbmVyU3R5bGU6e3Bvc2l0aW9uOlwicmVsYXRpdmVcIn0saW5pdExheW91dDohMCxvcmlnaW5MZWZ0OiEwLG9yaWdpblRvcDohMCxyZXNpemU6ITAscmVzaXplQ29udGFpbmVyOiEwLHRyYW5zaXRpb25EdXJhdGlvbjpcIjAuNHNcIixoaWRkZW5TdHlsZTp7b3BhY2l0eTowLHRyYW5zZm9ybTpcInNjYWxlKDAuMDAxKVwifSx2aXNpYmxlU3R5bGU6e29wYWNpdHk6MSx0cmFuc2Zvcm06XCJzY2FsZSgxKVwifX07dmFyIGY9ci5wcm90b3R5cGU7bi5leHRlbmQoZixlLnByb3RvdHlwZSksZi5vcHRpb249ZnVuY3Rpb24odCl7bi5leHRlbmQodGhpcy5vcHRpb25zLHQpfSxmLl9nZXRPcHRpb249ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5jb25zdHJ1Y3Rvci5jb21wYXRPcHRpb25zW3RdO3JldHVybiBlJiZ2b2lkIDAhPT10aGlzLm9wdGlvbnNbZV0/dGhpcy5vcHRpb25zW2VdOnRoaXMub3B0aW9uc1t0XX0sci5jb21wYXRPcHRpb25zPXtpbml0TGF5b3V0OlwiaXNJbml0TGF5b3V0XCIsaG9yaXpvbnRhbDpcImlzSG9yaXpvbnRhbFwiLGxheW91dEluc3RhbnQ6XCJpc0xheW91dEluc3RhbnRcIixvcmlnaW5MZWZ0OlwiaXNPcmlnaW5MZWZ0XCIsb3JpZ2luVG9wOlwiaXNPcmlnaW5Ub3BcIixyZXNpemU6XCJpc1Jlc2l6ZUJvdW5kXCIscmVzaXplQ29udGFpbmVyOlwiaXNSZXNpemluZ0NvbnRhaW5lclwifSxmLl9jcmVhdGU9ZnVuY3Rpb24oKXt0aGlzLnJlbG9hZEl0ZW1zKCksdGhpcy5zdGFtcHM9W10sdGhpcy5zdGFtcCh0aGlzLm9wdGlvbnMuc3RhbXApLG4uZXh0ZW5kKHRoaXMuZWxlbWVudC5zdHlsZSx0aGlzLm9wdGlvbnMuY29udGFpbmVyU3R5bGUpO3ZhciB0PXRoaXMuX2dldE9wdGlvbihcInJlc2l6ZVwiKTt0JiZ0aGlzLmJpbmRSZXNpemUoKX0sZi5yZWxvYWRJdGVtcz1mdW5jdGlvbigpe3RoaXMuaXRlbXM9dGhpcy5faXRlbWl6ZSh0aGlzLmVsZW1lbnQuY2hpbGRyZW4pfSxmLl9pdGVtaXplPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT10aGlzLl9maWx0ZXJGaW5kSXRlbUVsZW1lbnRzKHQpLGk9dGhpcy5jb25zdHJ1Y3Rvci5JdGVtLG49W10sbz0wO288ZS5sZW5ndGg7bysrKXt2YXIgcj1lW29dLHM9bmV3IGkocix0aGlzKTtuLnB1c2gocyl9cmV0dXJuIG59LGYuX2ZpbHRlckZpbmRJdGVtRWxlbWVudHM9ZnVuY3Rpb24odCl7cmV0dXJuIG4uZmlsdGVyRmluZEVsZW1lbnRzKHQsdGhpcy5vcHRpb25zLml0ZW1TZWxlY3Rvcil9LGYuZ2V0SXRlbUVsZW1lbnRzPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuaXRlbXMubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0LmVsZW1lbnR9KX0sZi5sYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLl9yZXNldExheW91dCgpLHRoaXMuX21hbmFnZVN0YW1wcygpO3ZhciB0PXRoaXMuX2dldE9wdGlvbihcImxheW91dEluc3RhbnRcIiksZT12b2lkIDAhPT10P3Q6IXRoaXMuX2lzTGF5b3V0SW5pdGVkO3RoaXMubGF5b3V0SXRlbXModGhpcy5pdGVtcyxlKSx0aGlzLl9pc0xheW91dEluaXRlZD0hMH0sZi5faW5pdD1mLmxheW91dCxmLl9yZXNldExheW91dD1mdW5jdGlvbigpe3RoaXMuZ2V0U2l6ZSgpfSxmLmdldFNpemU9ZnVuY3Rpb24oKXt0aGlzLnNpemU9aSh0aGlzLmVsZW1lbnQpfSxmLl9nZXRNZWFzdXJlbWVudD1mdW5jdGlvbih0LGUpe3ZhciBuLG89dGhpcy5vcHRpb25zW3RdO28/KFwic3RyaW5nXCI9PXR5cGVvZiBvP249dGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3Iobyk6byBpbnN0YW5jZW9mIEhUTUxFbGVtZW50JiYobj1vKSx0aGlzW3RdPW4/aShuKVtlXTpvKTp0aGlzW3RdPTB9LGYubGF5b3V0SXRlbXM9ZnVuY3Rpb24odCxlKXt0PXRoaXMuX2dldEl0ZW1zRm9yTGF5b3V0KHQpLHRoaXMuX2xheW91dEl0ZW1zKHQsZSksdGhpcy5fcG9zdExheW91dCgpfSxmLl9nZXRJdGVtc0ZvckxheW91dD1mdW5jdGlvbih0KXtyZXR1cm4gdC5maWx0ZXIoZnVuY3Rpb24odCl7cmV0dXJuIXQuaXNJZ25vcmVkfSl9LGYuX2xheW91dEl0ZW1zPWZ1bmN0aW9uKHQsZSl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcImxheW91dFwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgaT1bXTt0LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIG49dGhpcy5fZ2V0SXRlbUxheW91dFBvc2l0aW9uKHQpO24uaXRlbT10LG4uaXNJbnN0YW50PWV8fHQuaXNMYXlvdXRJbnN0YW50LGkucHVzaChuKX0sdGhpcyksdGhpcy5fcHJvY2Vzc0xheW91dFF1ZXVlKGkpfX0sZi5fZ2V0SXRlbUxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKCl7cmV0dXJue3g6MCx5OjB9fSxmLl9wcm9jZXNzTGF5b3V0UXVldWU9ZnVuY3Rpb24odCl7dGhpcy51cGRhdGVTdGFnZ2VyKCksdC5mb3JFYWNoKGZ1bmN0aW9uKHQsZSl7dGhpcy5fcG9zaXRpb25JdGVtKHQuaXRlbSx0LngsdC55LHQuaXNJbnN0YW50LGUpfSx0aGlzKX0sZi51cGRhdGVTdGFnZ2VyPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5vcHRpb25zLnN0YWdnZXI7cmV0dXJuIG51bGw9PT10fHx2b2lkIDA9PT10P3ZvaWQodGhpcy5zdGFnZ2VyPTApOih0aGlzLnN0YWdnZXI9YSh0KSx0aGlzLnN0YWdnZXIpfSxmLl9wb3NpdGlvbkl0ZW09ZnVuY3Rpb24odCxlLGksbixvKXtuP3QuZ29UbyhlLGkpOih0LnN0YWdnZXIobyp0aGlzLnN0YWdnZXIpLHQubW92ZVRvKGUsaSkpfSxmLl9wb3N0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5yZXNpemVDb250YWluZXIoKX0sZi5yZXNpemVDb250YWluZXI9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJyZXNpemVDb250YWluZXJcIik7aWYodCl7dmFyIGU9dGhpcy5fZ2V0Q29udGFpbmVyU2l6ZSgpO2UmJih0aGlzLl9zZXRDb250YWluZXJNZWFzdXJlKGUud2lkdGgsITApLHRoaXMuX3NldENvbnRhaW5lck1lYXN1cmUoZS5oZWlnaHQsITEpKX19LGYuX2dldENvbnRhaW5lclNpemU9ZCxmLl9zZXRDb250YWluZXJNZWFzdXJlPWZ1bmN0aW9uKHQsZSl7aWYodm9pZCAwIT09dCl7dmFyIGk9dGhpcy5zaXplO2kuaXNCb3JkZXJCb3gmJih0Kz1lP2kucGFkZGluZ0xlZnQraS5wYWRkaW5nUmlnaHQraS5ib3JkZXJMZWZ0V2lkdGgraS5ib3JkZXJSaWdodFdpZHRoOmkucGFkZGluZ0JvdHRvbStpLnBhZGRpbmdUb3AraS5ib3JkZXJUb3BXaWR0aCtpLmJvcmRlckJvdHRvbVdpZHRoKSx0PU1hdGgubWF4KHQsMCksdGhpcy5lbGVtZW50LnN0eWxlW2U/XCJ3aWR0aFwiOlwiaGVpZ2h0XCJdPXQrXCJweFwifX0sZi5fZW1pdENvbXBsZXRlT25JdGVtcz1mdW5jdGlvbih0LGUpe2Z1bmN0aW9uIGkoKXtvLmRpc3BhdGNoRXZlbnQodCtcIkNvbXBsZXRlXCIsbnVsbCxbZV0pfWZ1bmN0aW9uIG4oKXtzKysscz09ciYmaSgpfXZhciBvPXRoaXMscj1lLmxlbmd0aDtpZighZXx8IXIpcmV0dXJuIHZvaWQgaSgpO3ZhciBzPTA7ZS5mb3JFYWNoKGZ1bmN0aW9uKGUpe2Uub25jZSh0LG4pfSl9LGYuZGlzcGF0Y2hFdmVudD1mdW5jdGlvbih0LGUsaSl7dmFyIG49ZT9bZV0uY29uY2F0KGkpOmk7aWYodGhpcy5lbWl0RXZlbnQodCxuKSx1KWlmKHRoaXMuJGVsZW1lbnQ9dGhpcy4kZWxlbWVudHx8dSh0aGlzLmVsZW1lbnQpLGUpe3ZhciBvPXUuRXZlbnQoZSk7by50eXBlPXQsdGhpcy4kZWxlbWVudC50cmlnZ2VyKG8saSl9ZWxzZSB0aGlzLiRlbGVtZW50LnRyaWdnZXIodCxpKX0sZi5pZ25vcmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtKHQpO2UmJihlLmlzSWdub3JlZD0hMCl9LGYudW5pZ25vcmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtKHQpO2UmJmRlbGV0ZSBlLmlzSWdub3JlZH0sZi5zdGFtcD1mdW5jdGlvbih0KXt0PXRoaXMuX2ZpbmQodCksdCYmKHRoaXMuc3RhbXBzPXRoaXMuc3RhbXBzLmNvbmNhdCh0KSx0LmZvckVhY2godGhpcy5pZ25vcmUsdGhpcykpfSxmLnVuc3RhbXA9ZnVuY3Rpb24odCl7dD10aGlzLl9maW5kKHQpLHQmJnQuZm9yRWFjaChmdW5jdGlvbih0KXtuLnJlbW92ZUZyb20odGhpcy5zdGFtcHMsdCksdGhpcy51bmlnbm9yZSh0KX0sdGhpcyl9LGYuX2ZpbmQ9ZnVuY3Rpb24odCl7cmV0dXJuIHQ/KFwic3RyaW5nXCI9PXR5cGVvZiB0JiYodD10aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCh0KSksdD1uLm1ha2VBcnJheSh0KSk6dm9pZCAwfSxmLl9tYW5hZ2VTdGFtcHM9ZnVuY3Rpb24oKXt0aGlzLnN0YW1wcyYmdGhpcy5zdGFtcHMubGVuZ3RoJiYodGhpcy5fZ2V0Qm91bmRpbmdSZWN0KCksdGhpcy5zdGFtcHMuZm9yRWFjaCh0aGlzLl9tYW5hZ2VTdGFtcCx0aGlzKSl9LGYuX2dldEJvdW5kaW5nUmVjdD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxlPXRoaXMuc2l6ZTt0aGlzLl9ib3VuZGluZ1JlY3Q9e2xlZnQ6dC5sZWZ0K2UucGFkZGluZ0xlZnQrZS5ib3JkZXJMZWZ0V2lkdGgsdG9wOnQudG9wK2UucGFkZGluZ1RvcCtlLmJvcmRlclRvcFdpZHRoLHJpZ2h0OnQucmlnaHQtKGUucGFkZGluZ1JpZ2h0K2UuYm9yZGVyUmlnaHRXaWR0aCksYm90dG9tOnQuYm90dG9tLShlLnBhZGRpbmdCb3R0b20rZS5ib3JkZXJCb3R0b21XaWR0aCl9fSxmLl9tYW5hZ2VTdGFtcD1kLGYuX2dldEVsZW1lbnRPZmZzZXQ9ZnVuY3Rpb24odCl7dmFyIGU9dC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxuPXRoaXMuX2JvdW5kaW5nUmVjdCxvPWkodCkscj17bGVmdDplLmxlZnQtbi5sZWZ0LW8ubWFyZ2luTGVmdCx0b3A6ZS50b3Atbi50b3Atby5tYXJnaW5Ub3AscmlnaHQ6bi5yaWdodC1lLnJpZ2h0LW8ubWFyZ2luUmlnaHQsYm90dG9tOm4uYm90dG9tLWUuYm90dG9tLW8ubWFyZ2luQm90dG9tfTtyZXR1cm4gcn0sZi5oYW5kbGVFdmVudD1uLmhhbmRsZUV2ZW50LGYuYmluZFJlc2l6ZT1mdW5jdGlvbigpe3QuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMpLHRoaXMuaXNSZXNpemVCb3VuZD0hMH0sZi51bmJpbmRSZXNpemU9ZnVuY3Rpb24oKXt0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIix0aGlzKSx0aGlzLmlzUmVzaXplQm91bmQ9ITF9LGYub25yZXNpemU9ZnVuY3Rpb24oKXt0aGlzLnJlc2l6ZSgpfSxuLmRlYm91bmNlTWV0aG9kKHIsXCJvbnJlc2l6ZVwiLDEwMCksZi5yZXNpemU9ZnVuY3Rpb24oKXt0aGlzLmlzUmVzaXplQm91bmQmJnRoaXMubmVlZHNSZXNpemVMYXlvdXQoKSYmdGhpcy5sYXlvdXQoKX0sZi5uZWVkc1Jlc2l6ZUxheW91dD1mdW5jdGlvbigpe3ZhciB0PWkodGhpcy5lbGVtZW50KSxlPXRoaXMuc2l6ZSYmdDtyZXR1cm4gZSYmdC5pbm5lcldpZHRoIT09dGhpcy5zaXplLmlubmVyV2lkdGh9LGYuYWRkSXRlbXM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5faXRlbWl6ZSh0KTtyZXR1cm4gZS5sZW5ndGgmJih0aGlzLml0ZW1zPXRoaXMuaXRlbXMuY29uY2F0KGUpKSxlfSxmLmFwcGVuZGVkPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuYWRkSXRlbXModCk7ZS5sZW5ndGgmJih0aGlzLmxheW91dEl0ZW1zKGUsITApLHRoaXMucmV2ZWFsKGUpKX0sZi5wcmVwZW5kZWQ9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5faXRlbWl6ZSh0KTtpZihlLmxlbmd0aCl7dmFyIGk9dGhpcy5pdGVtcy5zbGljZSgwKTt0aGlzLml0ZW1zPWUuY29uY2F0KGkpLHRoaXMuX3Jlc2V0TGF5b3V0KCksdGhpcy5fbWFuYWdlU3RhbXBzKCksdGhpcy5sYXlvdXRJdGVtcyhlLCEwKSx0aGlzLnJldmVhbChlKSx0aGlzLmxheW91dEl0ZW1zKGkpfX0sZi5yZXZlYWw9ZnVuY3Rpb24odCl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcInJldmVhbFwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgZT10aGlzLnVwZGF0ZVN0YWdnZXIoKTt0LmZvckVhY2goZnVuY3Rpb24odCxpKXt0LnN0YWdnZXIoaSplKSx0LnJldmVhbCgpfSl9fSxmLmhpZGU9ZnVuY3Rpb24odCl7aWYodGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcImhpZGVcIix0KSx0JiZ0Lmxlbmd0aCl7dmFyIGU9dGhpcy51cGRhdGVTdGFnZ2VyKCk7dC5mb3JFYWNoKGZ1bmN0aW9uKHQsaSl7dC5zdGFnZ2VyKGkqZSksdC5oaWRlKCl9KX19LGYucmV2ZWFsSXRlbUVsZW1lbnRzPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5yZXZlYWwoZSl9LGYuaGlkZUl0ZW1FbGVtZW50cz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW1zKHQpO3RoaXMuaGlkZShlKX0sZi5nZXRJdGVtPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wO2U8dGhpcy5pdGVtcy5sZW5ndGg7ZSsrKXt2YXIgaT10aGlzLml0ZW1zW2VdO2lmKGkuZWxlbWVudD09dClyZXR1cm4gaX19LGYuZ2V0SXRlbXM9ZnVuY3Rpb24odCl7dD1uLm1ha2VBcnJheSh0KTt2YXIgZT1bXTtyZXR1cm4gdC5mb3JFYWNoKGZ1bmN0aW9uKHQpe3ZhciBpPXRoaXMuZ2V0SXRlbSh0KTtpJiZlLnB1c2goaSl9LHRoaXMpLGV9LGYucmVtb3ZlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5fZW1pdENvbXBsZXRlT25JdGVtcyhcInJlbW92ZVwiLGUpLGUmJmUubGVuZ3RoJiZlLmZvckVhY2goZnVuY3Rpb24odCl7dC5yZW1vdmUoKSxuLnJlbW92ZUZyb20odGhpcy5pdGVtcyx0KX0sdGhpcyl9LGYuZGVzdHJveT1mdW5jdGlvbigpe3ZhciB0PXRoaXMuZWxlbWVudC5zdHlsZTt0LmhlaWdodD1cIlwiLHQucG9zaXRpb249XCJcIix0LndpZHRoPVwiXCIsdGhpcy5pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKHQpe3QuZGVzdHJveSgpfSksdGhpcy51bmJpbmRSZXNpemUoKTt2YXIgZT10aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlEO2RlbGV0ZSBjW2VdLGRlbGV0ZSB0aGlzLmVsZW1lbnQub3V0bGF5ZXJHVUlELHUmJnUucmVtb3ZlRGF0YSh0aGlzLmVsZW1lbnQsdGhpcy5jb25zdHJ1Y3Rvci5uYW1lc3BhY2UpfSxyLmRhdGE9ZnVuY3Rpb24odCl7dD1uLmdldFF1ZXJ5RWxlbWVudCh0KTt2YXIgZT10JiZ0Lm91dGxheWVyR1VJRDtyZXR1cm4gZSYmY1tlXX0sci5jcmVhdGU9ZnVuY3Rpb24odCxlKXt2YXIgaT1zKHIpO3JldHVybiBpLmRlZmF1bHRzPW4uZXh0ZW5kKHt9LHIuZGVmYXVsdHMpLG4uZXh0ZW5kKGkuZGVmYXVsdHMsZSksaS5jb21wYXRPcHRpb25zPW4uZXh0ZW5kKHt9LHIuY29tcGF0T3B0aW9ucyksaS5uYW1lc3BhY2U9dCxpLmRhdGE9ci5kYXRhLGkuSXRlbT1zKG8pLG4uaHRtbEluaXQoaSx0KSx1JiZ1LmJyaWRnZXQmJnUuYnJpZGdldCh0LGkpLGl9O3ZhciBtPXttczoxLHM6MWUzfTtyZXR1cm4gci5JdGVtPW8scn0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShbXCJvdXRsYXllci9vdXRsYXllclwiLFwiZ2V0LXNpemUvZ2V0LXNpemVcIl0sZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZShyZXF1aXJlKFwib3V0bGF5ZXJcIikscmVxdWlyZShcImdldC1zaXplXCIpKTp0Lk1hc29ucnk9ZSh0Lk91dGxheWVyLHQuZ2V0U2l6ZSl9KHdpbmRvdyxmdW5jdGlvbih0LGUpe3ZhciBpPXQuY3JlYXRlKFwibWFzb25yeVwiKTtpLmNvbXBhdE9wdGlvbnMuZml0V2lkdGg9XCJpc0ZpdFdpZHRoXCI7dmFyIG49aS5wcm90b3R5cGU7cmV0dXJuIG4uX3Jlc2V0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5nZXRTaXplKCksdGhpcy5fZ2V0TWVhc3VyZW1lbnQoXCJjb2x1bW5XaWR0aFwiLFwib3V0ZXJXaWR0aFwiKSx0aGlzLl9nZXRNZWFzdXJlbWVudChcImd1dHRlclwiLFwib3V0ZXJXaWR0aFwiKSx0aGlzLm1lYXN1cmVDb2x1bW5zKCksdGhpcy5jb2xZcz1bXTtmb3IodmFyIHQ9MDt0PHRoaXMuY29sczt0KyspdGhpcy5jb2xZcy5wdXNoKDApO3RoaXMubWF4WT0wLHRoaXMuaG9yaXpvbnRhbENvbEluZGV4PTB9LG4ubWVhc3VyZUNvbHVtbnM9ZnVuY3Rpb24oKXtpZih0aGlzLmdldENvbnRhaW5lcldpZHRoKCksIXRoaXMuY29sdW1uV2lkdGgpe3ZhciB0PXRoaXMuaXRlbXNbMF0saT10JiZ0LmVsZW1lbnQ7dGhpcy5jb2x1bW5XaWR0aD1pJiZlKGkpLm91dGVyV2lkdGh8fHRoaXMuY29udGFpbmVyV2lkdGh9dmFyIG49dGhpcy5jb2x1bW5XaWR0aCs9dGhpcy5ndXR0ZXIsbz10aGlzLmNvbnRhaW5lcldpZHRoK3RoaXMuZ3V0dGVyLHI9by9uLHM9bi1vJW4sYT1zJiYxPnM/XCJyb3VuZFwiOlwiZmxvb3JcIjtyPU1hdGhbYV0ociksdGhpcy5jb2xzPU1hdGgubWF4KHIsMSl9LG4uZ2V0Q29udGFpbmVyV2lkdGg9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRPcHRpb24oXCJmaXRXaWR0aFwiKSxpPXQ/dGhpcy5lbGVtZW50LnBhcmVudE5vZGU6dGhpcy5lbGVtZW50LG49ZShpKTt0aGlzLmNvbnRhaW5lcldpZHRoPW4mJm4uaW5uZXJXaWR0aH0sbi5fZ2V0SXRlbUxheW91dFBvc2l0aW9uPWZ1bmN0aW9uKHQpe3QuZ2V0U2l6ZSgpO3ZhciBlPXQuc2l6ZS5vdXRlcldpZHRoJXRoaXMuY29sdW1uV2lkdGgsaT1lJiYxPmU/XCJyb3VuZFwiOlwiY2VpbFwiLG49TWF0aFtpXSh0LnNpemUub3V0ZXJXaWR0aC90aGlzLmNvbHVtbldpZHRoKTtuPU1hdGgubWluKG4sdGhpcy5jb2xzKTtmb3IodmFyIG89dGhpcy5vcHRpb25zLmhvcml6b250YWxPcmRlcj9cIl9nZXRIb3Jpem9udGFsQ29sUG9zaXRpb25cIjpcIl9nZXRUb3BDb2xQb3NpdGlvblwiLHI9dGhpc1tvXShuLHQpLHM9e3g6dGhpcy5jb2x1bW5XaWR0aCpyLmNvbCx5OnIueX0sYT1yLnkrdC5zaXplLm91dGVySGVpZ2h0LGg9bityLmNvbCx1PXIuY29sO2g+dTt1KyspdGhpcy5jb2xZc1t1XT1hO3JldHVybiBzfSxuLl9nZXRUb3BDb2xQb3NpdGlvbj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLl9nZXRUb3BDb2xHcm91cCh0KSxpPU1hdGgubWluLmFwcGx5KE1hdGgsZSk7cmV0dXJue2NvbDplLmluZGV4T2YoaSkseTppfX0sbi5fZ2V0VG9wQ29sR3JvdXA9ZnVuY3Rpb24odCl7aWYoMj50KXJldHVybiB0aGlzLmNvbFlzO2Zvcih2YXIgZT1bXSxpPXRoaXMuY29scysxLXQsbj0wO2k+bjtuKyspZVtuXT10aGlzLl9nZXRDb2xHcm91cFkobix0KTtyZXR1cm4gZX0sbi5fZ2V0Q29sR3JvdXBZPWZ1bmN0aW9uKHQsZSl7aWYoMj5lKXJldHVybiB0aGlzLmNvbFlzW3RdO3ZhciBpPXRoaXMuY29sWXMuc2xpY2UodCx0K2UpO3JldHVybiBNYXRoLm1heC5hcHBseShNYXRoLGkpfSxuLl9nZXRIb3Jpem9udGFsQ29sUG9zaXRpb249ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmhvcml6b250YWxDb2xJbmRleCV0aGlzLmNvbHMsbj10PjEmJmkrdD50aGlzLmNvbHM7aT1uPzA6aTt2YXIgbz1lLnNpemUub3V0ZXJXaWR0aCYmZS5zaXplLm91dGVySGVpZ2h0O3JldHVybiB0aGlzLmhvcml6b250YWxDb2xJbmRleD1vP2krdDp0aGlzLmhvcml6b250YWxDb2xJbmRleCx7Y29sOmkseTp0aGlzLl9nZXRDb2xHcm91cFkoaSx0KX19LG4uX21hbmFnZVN0YW1wPWZ1bmN0aW9uKHQpe3ZhciBpPWUodCksbj10aGlzLl9nZXRFbGVtZW50T2Zmc2V0KHQpLG89dGhpcy5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxyPW8/bi5sZWZ0Om4ucmlnaHQscz1yK2kub3V0ZXJXaWR0aCxhPU1hdGguZmxvb3Ioci90aGlzLmNvbHVtbldpZHRoKTthPU1hdGgubWF4KDAsYSk7dmFyIGg9TWF0aC5mbG9vcihzL3RoaXMuY29sdW1uV2lkdGgpO2gtPXMldGhpcy5jb2x1bW5XaWR0aD8wOjEsaD1NYXRoLm1pbih0aGlzLmNvbHMtMSxoKTtmb3IodmFyIHU9dGhpcy5fZ2V0T3B0aW9uKFwib3JpZ2luVG9wXCIpLGQ9KHU/bi50b3A6bi5ib3R0b20pK2kub3V0ZXJIZWlnaHQsbD1hO2g+PWw7bCsrKXRoaXMuY29sWXNbbF09TWF0aC5tYXgoZCx0aGlzLmNvbFlzW2xdKX0sbi5fZ2V0Q29udGFpbmVyU2l6ZT1mdW5jdGlvbigpe3RoaXMubWF4WT1NYXRoLm1heC5hcHBseShNYXRoLHRoaXMuY29sWXMpO3ZhciB0PXtoZWlnaHQ6dGhpcy5tYXhZfTtyZXR1cm4gdGhpcy5fZ2V0T3B0aW9uKFwiZml0V2lkdGhcIikmJih0LndpZHRoPXRoaXMuX2dldENvbnRhaW5lckZpdFdpZHRoKCkpLHR9LG4uX2dldENvbnRhaW5lckZpdFdpZHRoPWZ1bmN0aW9uKCl7Zm9yKHZhciB0PTAsZT10aGlzLmNvbHM7LS1lJiYwPT09dGhpcy5jb2xZc1tlXTspdCsrO3JldHVybih0aGlzLmNvbHMtdCkqdGhpcy5jb2x1bW5XaWR0aC10aGlzLmd1dHRlcn0sbi5uZWVkc1Jlc2l6ZUxheW91dD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuY29udGFpbmVyV2lkdGg7cmV0dXJuIHRoaXMuZ2V0Q29udGFpbmVyV2lkdGgoKSx0IT10aGlzLmNvbnRhaW5lcldpZHRofSxpfSk7IiwiXG5mdW5jdGlvbiBzdGFyRnVuY3Rpb24oeCwgeSkge1xuXG4gICAgYXBpX3VybCA9ICcvYXBpL3YxL3N0YXIvJyArIHkgKyAnLyc7XG5cbiAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImZhLXN0YXItb1wiKSl7XG4gICAgICAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcIm5vdC1sb2dnZWQtaW5cIikpe1xuLy8gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5jc3Moe1widmlzaWJpbGl0eVwiOlwidmlzaWJsZVwiLFwiZGlzcGxheVwiOlwiYmxvY2tcIn0pO1xuICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcbiAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmZhZGVJbigpO1xuLy8gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZU91dCgpO1xuICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwiZmEtc3Rhci1vXCIpXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJmYS1zdGFyXCIpXG4gICAgICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLCAgICAvL1lvdXIgYXBpIHVybFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BVVCcsICAgLy90eXBlIGlzIGFueSBIVFRQIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAgICAgIC8vRGF0YSBhcyBqcyBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwiZmEtc3RhclwiKSl7XG5cbiAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwiZmEtc3RhclwiKVxuICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJmYS1zdGFyLW9cIilcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnREVMRVRFJyxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIDtcbiAgICB9XG5cbn1cblxuJCgnLmNsb3NlLWljb24nKS5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xuICAkKHRoaXMpLmNsb3Nlc3QoJy5jYXJkJykuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xuICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZUluKCk7XG59KSIsIihmdW5jdGlvbigkKXtcInVzZSBzdHJpY3RcIjt2YXIgTWFnaWNTdWdnZXN0PWZ1bmN0aW9uKGVsZW1lbnQsb3B0aW9ucyl7dmFyIG1zPXRoaXM7dmFyIGRlZmF1bHRzPXthbGxvd0ZyZWVFbnRyaWVzOnRydWUsYWxsb3dEdXBsaWNhdGVzOmZhbHNlLGFqYXhDb25maWc6e30sYXV0b1NlbGVjdDp0cnVlLHNlbGVjdEZpcnN0OmZhbHNlLHF1ZXJ5UGFyYW06XCJxdWVyeVwiLGJlZm9yZVNlbmQ6ZnVuY3Rpb24oKXt9LGNsczpcIlwiLGRhdGE6bnVsbCxkYXRhVXJsUGFyYW1zOnt9LGRpc2FibGVkOmZhbHNlLGRpc2FibGVkRmllbGQ6bnVsbCxkaXNwbGF5RmllbGQ6XCJuYW1lXCIsZWRpdGFibGU6dHJ1ZSxleHBhbmRlZDpmYWxzZSxleHBhbmRPbkZvY3VzOmZhbHNlLGdyb3VwQnk6bnVsbCxoaWRlVHJpZ2dlcjpmYWxzZSxoaWdobGlnaHQ6dHJ1ZSxpZDpudWxsLGluZm9Nc2dDbHM6XCJcIixpbnB1dENmZzp7fSxpbnZhbGlkQ2xzOlwibXMtaW52XCIsbWF0Y2hDYXNlOmZhbHNlLG1heERyb3BIZWlnaHQ6MjkwLG1heEVudHJ5TGVuZ3RoOm51bGwsbWF4RW50cnlSZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIlBsZWFzZSByZWR1Y2UgeW91ciBlbnRyeSBieSBcIit2K1wiIGNoYXJhY3RlclwiKyh2PjE/XCJzXCI6XCJcIil9LG1heFN1Z2dlc3Rpb25zOm51bGwsbWF4U2VsZWN0aW9uOjEwLG1heFNlbGVjdGlvblJlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiWW91IGNhbm5vdCBjaG9vc2UgbW9yZSB0aGFuIFwiK3YrXCIgaXRlbVwiKyh2PjE/XCJzXCI6XCJcIil9LG1ldGhvZDpcIlBPU1RcIixtaW5DaGFyczowLG1pbkNoYXJzUmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJQbGVhc2UgdHlwZSBcIit2K1wiIG1vcmUgY2hhcmFjdGVyXCIrKHY+MT9cInNcIjpcIlwiKX0sbW9kZTpcImxvY2FsXCIsbmFtZTpudWxsLG5vU3VnZ2VzdGlvblRleHQ6XCJObyBzdWdnZXN0aW9uc1wiLHBsYWNlaG9sZGVyOlwiVHlwZSBvciBjbGljayBoZXJlXCIscmVuZGVyZXI6bnVsbCxyZXF1aXJlZDpmYWxzZSxyZXN1bHRBc1N0cmluZzpmYWxzZSxyZXN1bHRBc1N0cmluZ0RlbGltaXRlcjpcIixcIixyZXN1bHRzRmllbGQ6XCJyZXN1bHRzXCIsc2VsZWN0aW9uQ2xzOlwiXCIsc2VsZWN0aW9uQ29udGFpbmVyOm51bGwsc2VsZWN0aW9uUG9zaXRpb246XCJpbm5lclwiLHNlbGVjdGlvblJlbmRlcmVyOm51bGwsc2VsZWN0aW9uU3RhY2tlZDpmYWxzZSxzb3J0RGlyOlwiYXNjXCIsc29ydE9yZGVyOm51bGwsc3RyaWN0U3VnZ2VzdDpmYWxzZSxzdHlsZTpcIlwiLHRvZ2dsZU9uQ2xpY2s6ZmFsc2UsdHlwZURlbGF5OjQwMCx1c2VUYWJLZXk6ZmFsc2UsdXNlQ29tbWFLZXk6dHJ1ZSx1c2VaZWJyYVN0eWxlOmZhbHNlLHZhbHVlOm51bGwsdmFsdWVGaWVsZDpcImlkXCIsdnJlZ2V4Om51bGwsdnR5cGU6bnVsbH07dmFyIGNvbmY9JC5leHRlbmQoe30sb3B0aW9ucyk7dmFyIGNmZz0kLmV4dGVuZCh0cnVlLHt9LGRlZmF1bHRzLGNvbmYpO3RoaXMuYWRkVG9TZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMsaXNTaWxlbnQpe2lmKCFjZmcubWF4U2VsZWN0aW9ufHxfc2VsZWN0aW9uLmxlbmd0aDxjZmcubWF4U2VsZWN0aW9uKXtpZighJC5pc0FycmF5KGl0ZW1zKSl7aXRlbXM9W2l0ZW1zXX12YXIgdmFsdWVjaGFuZ2VkPWZhbHNlOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCxqc29uKXtpZihjZmcuYWxsb3dEdXBsaWNhdGVzfHwkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sbXMuZ2V0VmFsdWUoKSk9PT0tMSl7X3NlbGVjdGlvbi5wdXNoKGpzb24pO3ZhbHVlY2hhbmdlZD10cnVlfX0pO2lmKHZhbHVlY2hhbmdlZD09PXRydWUpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO3RoaXMuZW1wdHkoKTtpZihpc1NpbGVudCE9PXRydWUpeyQodGhpcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFt0aGlzLHRoaXMuZ2V0U2VsZWN0aW9uKCldKX19fXRoaXMuaW5wdXQuYXR0cihcInBsYWNlaG9sZGVyXCIsY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiZ0aGlzLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpfTt0aGlzLmNsZWFyPWZ1bmN0aW9uKGlzU2lsZW50KXt0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb24oX3NlbGVjdGlvbi5zbGljZSgwKSxpc1NpbGVudCl9O3RoaXMuY29sbGFwc2U9ZnVuY3Rpb24oKXtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXt0aGlzLmNvbWJvYm94LmRldGFjaCgpO2NmZy5leHBhbmRlZD1mYWxzZTskKHRoaXMpLnRyaWdnZXIoXCJjb2xsYXBzZVwiLFt0aGlzXSl9fTt0aGlzLmRpc2FibGU9ZnVuY3Rpb24oKXt0aGlzLmNvbnRhaW5lci5hZGRDbGFzcyhcIm1zLWN0bi1kaXNhYmxlZFwiKTtjZmcuZGlzYWJsZWQ9dHJ1ZTttcy5pbnB1dC5hdHRyKFwiZGlzYWJsZWRcIix0cnVlKX07dGhpcy5lbXB0eT1mdW5jdGlvbigpe3RoaXMuaW5wdXQudmFsKFwiXCIpfTt0aGlzLmVuYWJsZT1mdW5jdGlvbigpe3RoaXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKFwibXMtY3RuLWRpc2FibGVkXCIpO2NmZy5kaXNhYmxlZD1mYWxzZTttcy5pbnB1dC5hdHRyKFwiZGlzYWJsZWRcIixmYWxzZSl9O3RoaXMuZXhwYW5kPWZ1bmN0aW9uKCl7aWYoIWNmZy5leHBhbmRlZCYmKHRoaXMuaW5wdXQudmFsKCkubGVuZ3RoPj1jZmcubWluQ2hhcnN8fHRoaXMuY29tYm9ib3guY2hpbGRyZW4oKS5zaXplKCk+MCkpe3RoaXMuY29tYm9ib3guYXBwZW5kVG8odGhpcy5jb250YWluZXIpO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO2NmZy5leHBhbmRlZD10cnVlOyQodGhpcykudHJpZ2dlcihcImV4cGFuZFwiLFt0aGlzXSl9fTt0aGlzLmlzRGlzYWJsZWQ9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLmRpc2FibGVkfTt0aGlzLmlzVmFsaWQ9ZnVuY3Rpb24oKXt2YXIgdmFsaWQ9Y2ZnLnJlcXVpcmVkPT09ZmFsc2V8fF9zZWxlY3Rpb24ubGVuZ3RoPjA7aWYoY2ZnLnZ0eXBlfHxjZmcudnJlZ2V4KXskLmVhY2goX3NlbGVjdGlvbixmdW5jdGlvbihpbmRleCxpdGVtKXt2YWxpZD12YWxpZCYmc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKGl0ZW1bY2ZnLnZhbHVlRmllbGRdKX0pfXJldHVybiB2YWxpZH07dGhpcy5nZXREYXRhVXJsUGFyYW1zPWZ1bmN0aW9uKCl7cmV0dXJuIGNmZy5kYXRhVXJsUGFyYW1zfTt0aGlzLmdldE5hbWU9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLm5hbWV9O3RoaXMuZ2V0U2VsZWN0aW9uPWZ1bmN0aW9uKCl7cmV0dXJuIF9zZWxlY3Rpb259O3RoaXMuZ2V0UmF3VmFsdWU9ZnVuY3Rpb24oKXtyZXR1cm4gbXMuaW5wdXQudmFsKCl9O3RoaXMuZ2V0VmFsdWU9ZnVuY3Rpb24oKXtyZXR1cm4gJC5tYXAoX3NlbGVjdGlvbixmdW5jdGlvbihvKXtyZXR1cm4gb1tjZmcudmFsdWVGaWVsZF19KX07dGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uPWZ1bmN0aW9uKGl0ZW1zLGlzU2lsZW50KXtpZighJC5pc0FycmF5KGl0ZW1zKSl7aXRlbXM9W2l0ZW1zXX12YXIgdmFsdWVjaGFuZ2VkPWZhbHNlOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCxqc29uKXt2YXIgaT0kLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sbXMuZ2V0VmFsdWUoKSk7aWYoaT4tMSl7X3NlbGVjdGlvbi5zcGxpY2UoaSwxKTt2YWx1ZWNoYW5nZWQ9dHJ1ZX19KTtpZih2YWx1ZWNoYW5nZWQ9PT10cnVlKXtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtpZihpc1NpbGVudCE9PXRydWUpeyQodGhpcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFt0aGlzLHRoaXMuZ2V0U2VsZWN0aW9uKCldKX1pZihjZmcuZXhwYW5kT25Gb2N1cyl7bXMuZXhwYW5kKCl9aWYoY2ZnLmV4cGFuZGVkKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX19dGhpcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJnRoaXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcil9O3RoaXMuZ2V0RGF0YT1mdW5jdGlvbigpe3JldHVybiBfY2JEYXRhfTt0aGlzLnNldERhdGE9ZnVuY3Rpb24oZGF0YSl7Y2ZnLmRhdGE9ZGF0YTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX07dGhpcy5zZXROYW1lPWZ1bmN0aW9uKG5hbWUpe2NmZy5uYW1lPW5hbWU7aWYobmFtZSl7Y2ZnLm5hbWUrPW5hbWUuaW5kZXhPZihcIltdXCIpPjA/XCJcIjpcIltdXCJ9aWYobXMuX3ZhbHVlQ29udGFpbmVyKXskLmVhY2gobXMuX3ZhbHVlQ29udGFpbmVyLmNoaWxkcmVuKCksZnVuY3Rpb24oaSxlbCl7ZWwubmFtZT1jZmcubmFtZX0pfX07dGhpcy5zZXRTZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMpe3RoaXMuY2xlYXIoKTt0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKX07dGhpcy5zZXRWYWx1ZT1mdW5jdGlvbih2YWx1ZXMpe3ZhciBpdGVtcz1bXTskLmVhY2godmFsdWVzLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgZm91bmQ9ZmFsc2U7JC5lYWNoKF9jYkRhdGEsZnVuY3Rpb24oaSxpdGVtKXtpZihpdGVtW2NmZy52YWx1ZUZpZWxkXT09dmFsdWUpe2l0ZW1zLnB1c2goaXRlbSk7Zm91bmQ9dHJ1ZTtyZXR1cm4gZmFsc2V9fSk7aWYoIWZvdW5kKXtpZih0eXBlb2YgdmFsdWU9PT1cIm9iamVjdFwiKXtpdGVtcy5wdXNoKHZhbHVlKX1lbHNle3ZhciBqc29uPXt9O2pzb25bY2ZnLnZhbHVlRmllbGRdPXZhbHVlO2pzb25bY2ZnLmRpc3BsYXlGaWVsZF09dmFsdWU7aXRlbXMucHVzaChqc29uKX19fSk7aWYoaXRlbXMubGVuZ3RoPjApe3RoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpfX07dGhpcy5zZXREYXRhVXJsUGFyYW1zPWZ1bmN0aW9uKHBhcmFtcyl7Y2ZnLmRhdGFVcmxQYXJhbXM9JC5leHRlbmQoe30scGFyYW1zKX07dmFyIF9zZWxlY3Rpb249W10sX2NvbWJvSXRlbUhlaWdodD0wLF90aW1lcixfaGFzRm9jdXM9ZmFsc2UsX2dyb3Vwcz1udWxsLF9jYkRhdGE9W10sX2N0cmxEb3duPWZhbHNlLEtFWUNPREVTPXtCQUNLU1BBQ0U6OCxUQUI6OSxFTlRFUjoxMyxDVFJMOjE3LEVTQzoyNyxTUEFDRTozMixVUEFSUk9XOjM4LERPV05BUlJPVzo0MCxDT01NQToxODh9O3ZhciBzZWxmPXtfZGlzcGxheVN1Z2dlc3Rpb25zOmZ1bmN0aW9uKGRhdGEpe21zLmNvbWJvYm94LnNob3coKTttcy5jb21ib2JveC5lbXB0eSgpO3ZhciByZXNIZWlnaHQ9MCxuYkdyb3Vwcz0wO2lmKF9ncm91cHM9PT1udWxsKXtzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKGRhdGEpO3Jlc0hlaWdodD1fY29tYm9JdGVtSGVpZ2h0KmRhdGEubGVuZ3RofWVsc2V7Zm9yKHZhciBncnBOYW1lIGluIF9ncm91cHMpe25iR3JvdXBzKz0xOyQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWdyb3VwXCIsaHRtbDpncnBOYW1lfSkuYXBwZW5kVG8obXMuY29tYm9ib3gpO3NlbGYuX3JlbmRlckNvbWJvSXRlbXMoX2dyb3Vwc1tncnBOYW1lXS5pdGVtcyx0cnVlKX12YXIgX2dyb3VwSXRlbUhlaWdodD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1ncm91cFwiKS5vdXRlckhlaWdodCgpO2lmKF9ncm91cEl0ZW1IZWlnaHQhPT1udWxsKXt2YXIgdG1wUmVzSGVpZ2h0PW5iR3JvdXBzKl9ncm91cEl0ZW1IZWlnaHQ7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqZGF0YS5sZW5ndGgrdG1wUmVzSGVpZ2h0fWVsc2V7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqKGRhdGEubGVuZ3RoK25iR3JvdXBzKX19aWYocmVzSGVpZ2h0PG1zLmNvbWJvYm94LmhlaWdodCgpfHxyZXNIZWlnaHQ8PWNmZy5tYXhEcm9wSGVpZ2h0KXttcy5jb21ib2JveC5oZWlnaHQocmVzSGVpZ2h0KX1lbHNlIGlmKHJlc0hlaWdodD49bXMuY29tYm9ib3guaGVpZ2h0KCkmJnJlc0hlaWdodD5jZmcubWF4RHJvcEhlaWdodCl7bXMuY29tYm9ib3guaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KX1pZihkYXRhLmxlbmd0aD09PTEmJmNmZy5hdXRvU2VsZWN0PT09dHJ1ZSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoXCI6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6bGFzdFwiKS5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX1pZihjZmcuc2VsZWN0Rmlyc3Q9PT10cnVlKXttcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcihcIjpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKS5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX1pZihkYXRhLmxlbmd0aD09PTAmJm1zLmdldFJhd1ZhbHVlKCkhPT1cIlwiKXt2YXIgbm9TdWdnZXN0aW9uVGV4dD1jZmcubm9TdWdnZXN0aW9uVGV4dC5yZXBsYWNlKC9cXHtcXHsuKlxcfVxcfS8sbXMuaW5wdXQudmFsKCkpO3NlbGYuX3VwZGF0ZUhlbHBlcihub1N1Z2dlc3Rpb25UZXh0KTttcy5jb2xsYXBzZSgpfWlmKGNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09ZmFsc2Upe2lmKGRhdGEubGVuZ3RoPT09MCl7JChtcy5pbnB1dCkuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO21zLmNvbWJvYm94LmhpZGUoKX1lbHNleyQobXMuaW5wdXQpLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKX19fSxfZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheTpmdW5jdGlvbihkYXRhKXt2YXIganNvbj1bXTskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCxzKXt2YXIgZW50cnk9e307ZW50cnlbY2ZnLmRpc3BsYXlGaWVsZF09ZW50cnlbY2ZnLnZhbHVlRmllbGRdPSQudHJpbShzKTtqc29uLnB1c2goZW50cnkpfSk7cmV0dXJuIGpzb259LF9oaWdobGlnaHRTdWdnZXN0aW9uOmZ1bmN0aW9uKGh0bWwpe3ZhciBxPW1zLmlucHV0LnZhbCgpO3ZhciBzcGVjaWFsQ2hhcmFjdGVycz1bXCJeXCIsXCIkXCIsXCIqXCIsXCIrXCIsXCI/XCIsXCIuXCIsXCIoXCIsXCIpXCIsXCI6XCIsXCIhXCIsXCJ8XCIsXCJ7XCIsXCJ9XCIsXCJbXCIsXCJdXCJdOyQuZWFjaChzcGVjaWFsQ2hhcmFjdGVycyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7cT1xLnJlcGxhY2UodmFsdWUsXCJcXFxcXCIrdmFsdWUpfSk7aWYocS5sZW5ndGg9PT0wKXtyZXR1cm4gaHRtbH12YXIgZ2xvYj1jZmcubWF0Y2hDYXNlPT09dHJ1ZT9cImdcIjpcImdpXCI7cmV0dXJuIGh0bWwucmVwbGFjZShuZXcgUmVnRXhwKFwiKFwiK3ErXCIpKD8hKFtePF0rKT8+KVwiLGdsb2IpLFwiPGVtPiQxPC9lbT5cIil9LF9tb3ZlU2VsZWN0ZWRSb3c6ZnVuY3Rpb24oZGlyKXtpZighY2ZnLmV4cGFuZGVkKXttcy5leHBhbmQoKX12YXIgbGlzdCxzdGFydCxhY3RpdmUsc2Nyb2xsUG9zO2xpc3Q9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKTtpZihkaXI9PT1cImRvd25cIil7c3RhcnQ9bGlzdC5lcSgwKX1lbHNle3N0YXJ0PWxpc3QuZmlsdGVyKFwiOmxhc3RcIil9YWN0aXZlPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpO2lmKGFjdGl2ZS5sZW5ndGg+MCl7aWYoZGlyPT09XCJkb3duXCIpe3N0YXJ0PWFjdGl2ZS5uZXh0QWxsKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpLmZpcnN0KCk7aWYoc3RhcnQubGVuZ3RoPT09MCl7c3RhcnQ9bGlzdC5lcSgwKX1zY3JvbGxQb3M9bXMuY29tYm9ib3guc2Nyb2xsVG9wKCk7bXMuY29tYm9ib3guc2Nyb2xsVG9wKDApO2lmKHN0YXJ0WzBdLm9mZnNldFRvcCtzdGFydC5vdXRlckhlaWdodCgpPm1zLmNvbWJvYm94LmhlaWdodCgpKXttcy5jb21ib2JveC5zY3JvbGxUb3Aoc2Nyb2xsUG9zK19jb21ib0l0ZW1IZWlnaHQpfX1lbHNle3N0YXJ0PWFjdGl2ZS5wcmV2QWxsKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpLmZpcnN0KCk7aWYoc3RhcnQubGVuZ3RoPT09MCl7c3RhcnQ9bGlzdC5maWx0ZXIoXCI6bGFzdFwiKTttcy5jb21ib2JveC5zY3JvbGxUb3AoX2NvbWJvSXRlbUhlaWdodCpsaXN0Lmxlbmd0aCl9aWYoc3RhcnRbMF0ub2Zmc2V0VG9wPG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpKXttcy5jb21ib2JveC5zY3JvbGxUb3AobXMuY29tYm9ib3guc2Nyb2xsVG9wKCktX2NvbWJvSXRlbUhlaWdodCl9fX1saXN0LnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO3N0YXJ0LmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfSxfcHJvY2Vzc1N1Z2dlc3Rpb25zOmZ1bmN0aW9uKHNvdXJjZSl7dmFyIGpzb249bnVsbCxkYXRhPXNvdXJjZXx8Y2ZnLmRhdGE7aWYoZGF0YSE9PW51bGwpe2lmKHR5cGVvZiBkYXRhPT09XCJmdW5jdGlvblwiKXtkYXRhPWRhdGEuY2FsbChtcyxtcy5nZXRSYXdWYWx1ZSgpKX1pZih0eXBlb2YgZGF0YT09PVwic3RyaW5nXCIpeyQobXMpLnRyaWdnZXIoXCJiZWZvcmVsb2FkXCIsW21zXSk7dmFyIHF1ZXJ5UGFyYW1zPXt9O3F1ZXJ5UGFyYW1zW2NmZy5xdWVyeVBhcmFtXT1tcy5pbnB1dC52YWwoKTt2YXIgcGFyYW1zPSQuZXh0ZW5kKHF1ZXJ5UGFyYW1zLGNmZy5kYXRhVXJsUGFyYW1zKTskLmFqYXgoJC5leHRlbmQoe3R5cGU6Y2ZnLm1ldGhvZCx1cmw6ZGF0YSxkYXRhOnBhcmFtcyxiZWZvcmVTZW5kOmNmZy5iZWZvcmVTZW5kLHN1Y2Nlc3M6ZnVuY3Rpb24oYXN5bmNEYXRhKXtqc29uPXR5cGVvZiBhc3luY0RhdGE9PT1cInN0cmluZ1wiP0pTT04ucGFyc2UoYXN5bmNEYXRhKTphc3luY0RhdGE7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKGpzb24pOyQobXMpLnRyaWdnZXIoXCJsb2FkXCIsW21zLGpzb25dKTtpZihzZWxmLl9hc3luY1ZhbHVlcyl7bXMuc2V0VmFsdWUodHlwZW9mIHNlbGYuX2FzeW5jVmFsdWVzPT09XCJzdHJpbmdcIj9KU09OLnBhcnNlKHNlbGYuX2FzeW5jVmFsdWVzKTpzZWxmLl9hc3luY1ZhbHVlcyk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7ZGVsZXRlIHNlbGYuX2FzeW5jVmFsdWVzfX0sZXJyb3I6ZnVuY3Rpb24oKXt0aHJvd1wiQ291bGQgbm90IHJlYWNoIHNlcnZlclwifX0sY2ZnLmFqYXhDb25maWcpKTtyZXR1cm59ZWxzZXtpZihkYXRhLmxlbmd0aD4wJiZ0eXBlb2YgZGF0YVswXT09PVwic3RyaW5nXCIpe19jYkRhdGE9c2VsZi5fZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheShkYXRhKX1lbHNle19jYkRhdGE9ZGF0YVtjZmcucmVzdWx0c0ZpZWxkXXx8ZGF0YX19dmFyIHNvcnRlZERhdGE9Y2ZnLm1vZGU9PT1cInJlbW90ZVwiP19jYkRhdGE6c2VsZi5fc29ydEFuZFRyaW0oX2NiRGF0YSk7c2VsZi5fZGlzcGxheVN1Z2dlc3Rpb25zKHNlbGYuX2dyb3VwKHNvcnRlZERhdGEpKX19LF9yZW5kZXI6ZnVuY3Rpb24oZWwpe21zLnNldE5hbWUoY2ZnLm5hbWUpO21zLmNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLWN0biBmb3JtLWNvbnRyb2wgXCIrKGNmZy5yZXN1bHRBc1N0cmluZz9cIm1zLWFzLXN0cmluZyBcIjpcIlwiKStjZmcuY2xzKygkKGVsKS5oYXNDbGFzcyhcImlucHV0LWxnXCIpP1wiIGlucHV0LWxnXCI6XCJcIikrKCQoZWwpLmhhc0NsYXNzKFwiaW5wdXQtc21cIik/XCIgaW5wdXQtc21cIjpcIlwiKSsoY2ZnLmRpc2FibGVkPT09dHJ1ZT9cIiBtcy1jdG4tZGlzYWJsZWRcIjpcIlwiKSsoY2ZnLmVkaXRhYmxlPT09dHJ1ZT9cIlwiOlwiIG1zLWN0bi1yZWFkb25seVwiKSsoY2ZnLmhpZGVUcmlnZ2VyPT09ZmFsc2U/XCJcIjpcIiBtcy1uby10cmlnZ2VyXCIpLHN0eWxlOmNmZy5zdHlsZSxpZDpjZmcuaWR9KTttcy5jb250YWluZXIuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cyx0aGlzKSk7bXMuY29udGFpbmVyLmJsdXIoJC5wcm94eShoYW5kbGVycy5fb25CbHVyLHRoaXMpKTttcy5jb250YWluZXIua2V5ZG93bigkLnByb3h5KGhhbmRsZXJzLl9vbktleURvd24sdGhpcykpO21zLmNvbnRhaW5lci5rZXl1cCgkLnByb3h5KGhhbmRsZXJzLl9vbktleVVwLHRoaXMpKTttcy5pbnB1dD0kKFwiPGlucHV0Lz5cIiwkLmV4dGVuZCh7dHlwZTpcInRleHRcIixcImNsYXNzXCI6Y2ZnLmVkaXRhYmxlPT09dHJ1ZT9cIlwiOlwiIG1zLWlucHV0LXJlYWRvbmx5XCIscmVhZG9ubHk6IWNmZy5lZGl0YWJsZSxwbGFjZWhvbGRlcjpjZmcucGxhY2Vob2xkZXIsZGlzYWJsZWQ6Y2ZnLmRpc2FibGVkfSxjZmcuaW5wdXRDZmcpKTttcy5pbnB1dC5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Rm9jdXMsdGhpcykpO21zLmlucHV0LmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRDbGljayx0aGlzKSk7bXMuY29tYm9ib3g9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtY3RuIGRyb3Bkb3duLW1lbnVcIn0pLmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7bXMuY29tYm9ib3gub24oXCJjbGlja1wiLFwiZGl2Lm1zLXJlcy1pdGVtXCIsJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1TZWxlY3RlZCx0aGlzKSk7bXMuY29tYm9ib3gub24oXCJtb3VzZW92ZXJcIixcImRpdi5tcy1yZXMtaXRlbVwiLCQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtTW91c2VPdmVyLHRoaXMpKTtpZihjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5zZWxlY3Rpb25Db250YWluZXI9Y2ZnLnNlbGVjdGlvbkNvbnRhaW5lcjskKG1zLnNlbGVjdGlvbkNvbnRhaW5lcikuYWRkQ2xhc3MoXCJtcy1zZWwtY3RuXCIpfWVsc2V7bXMuc2VsZWN0aW9uQ29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWN0blwifSl9bXMuc2VsZWN0aW9uQ29udGFpbmVyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsdGhpcykpO2lmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLnNlbGVjdGlvbkNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpfWVsc2V7bXMuY29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCl9bXMuaGVscGVyPSQoXCI8c3Bhbi8+XCIse1wiY2xhc3NcIjpcIm1zLWhlbHBlciBcIitjZmcuaW5mb01zZ0Nsc30pO3NlbGYuX3VwZGF0ZUhlbHBlcigpO21zLmNvbnRhaW5lci5hcHBlbmQobXMuaGVscGVyKTskKGVsKS5yZXBsYWNlV2l0aChtcy5jb250YWluZXIpO2lmKCFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtzd2l0Y2goY2ZnLnNlbGVjdGlvblBvc2l0aW9uKXtjYXNlXCJib3R0b21cIjptcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtpZihjZmcuc2VsZWN0aW9uU3RhY2tlZD09PXRydWUpe21zLnNlbGVjdGlvbkNvbnRhaW5lci53aWR0aChtcy5jb250YWluZXIud2lkdGgoKSk7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmFkZENsYXNzKFwibXMtc3RhY2tlZFwiKX1icmVhaztjYXNlXCJyaWdodFwiOm1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO21zLmNvbnRhaW5lci5jc3MoXCJmbG9hdFwiLFwibGVmdFwiKTticmVhaztkZWZhdWx0Om1zLmNvbnRhaW5lci5hcHBlbmQobXMuc2VsZWN0aW9uQ29udGFpbmVyKTticmVha319aWYoY2ZnLmhpZGVUcmlnZ2VyPT09ZmFsc2Upe21zLnRyaWdnZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy10cmlnZ2VyXCIsaHRtbDonPGRpdiBjbGFzcz1cIm1zLXRyaWdnZXItaWNvXCI+PC9kaXY+J30pO21zLnRyaWdnZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UcmlnZ2VyQ2xpY2ssdGhpcykpO21zLmNvbnRhaW5lci5hcHBlbmQobXMudHJpZ2dlcil9JCh3aW5kb3cpLnJlc2l6ZSgkLnByb3h5KGhhbmRsZXJzLl9vbldpbmRvd1Jlc2l6ZWQsdGhpcykpO2lmKGNmZy52YWx1ZSE9PW51bGx8fGNmZy5kYXRhIT09bnVsbCl7aWYodHlwZW9mIGNmZy5kYXRhPT09XCJzdHJpbmdcIil7c2VsZi5fYXN5bmNWYWx1ZXM9Y2ZnLnZhbHVlO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfWVsc2V7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7aWYoY2ZnLnZhbHVlIT09bnVsbCl7bXMuc2V0VmFsdWUoY2ZnLnZhbHVlKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKX19fSQoXCJib2R5XCIpLmNsaWNrKGZ1bmN0aW9uKGUpe2lmKG1zLmNvbnRhaW5lci5oYXNDbGFzcyhcIm1zLWN0bi1mb2N1c1wiKSYmbXMuY29udGFpbmVyLmhhcyhlLnRhcmdldCkubGVuZ3RoPT09MCYmZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoXCJtcy1yZXMtaXRlbVwiKTwwJiZlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZihcIm1zLWNsb3NlLWJ0blwiKTwwJiZtcy5jb250YWluZXJbMF0hPT1lLnRhcmdldCl7aGFuZGxlcnMuX29uQmx1cigpfX0pO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe2NmZy5leHBhbmRlZD1mYWxzZTttcy5leHBhbmQoKX19LF9yZW5kZXJDb21ib0l0ZW1zOmZ1bmN0aW9uKGl0ZW1zLGlzR3JvdXBlZCl7dmFyIHJlZj10aGlzLGh0bWw9XCJcIjskLmVhY2goaXRlbXMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBkaXNwbGF5ZWQ9Y2ZnLnJlbmRlcmVyIT09bnVsbD9jZmcucmVuZGVyZXIuY2FsbChyZWYsdmFsdWUpOnZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO3ZhciBkaXNhYmxlZD1jZmcuZGlzYWJsZWRGaWVsZCE9PW51bGwmJnZhbHVlW2NmZy5kaXNhYmxlZEZpZWxkXT09PXRydWU7dmFyIHJlc3VsdEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1pdGVtIFwiKyhpc0dyb3VwZWQ/XCJtcy1yZXMtaXRlbS1ncm91cGVkIFwiOlwiXCIpKyhkaXNhYmxlZD9cIm1zLXJlcy1pdGVtLWRpc2FibGVkIFwiOlwiXCIpKyhpbmRleCUyPT09MSYmY2ZnLnVzZVplYnJhU3R5bGU9PT10cnVlP1wibXMtcmVzLW9kZFwiOlwiXCIpLGh0bWw6Y2ZnLmhpZ2hsaWdodD09PXRydWU/c2VsZi5faGlnaGxpZ2h0U3VnZ2VzdGlvbihkaXNwbGF5ZWQpOmRpc3BsYXllZCxcImRhdGEtanNvblwiOkpTT04uc3RyaW5naWZ5KHZhbHVlKX0pO2h0bWwrPSQoXCI8ZGl2Lz5cIikuYXBwZW5kKHJlc3VsdEl0ZW1FbCkuaHRtbCgpfSk7bXMuY29tYm9ib3guYXBwZW5kKGh0bWwpO19jb21ib0l0ZW1IZWlnaHQ9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbTpmaXJzdFwiKS5vdXRlckhlaWdodCgpfSxfcmVuZGVyU2VsZWN0aW9uOmZ1bmN0aW9uKCl7dmFyIHJlZj10aGlzLHc9MCxpbnB1dE9mZnNldD0wLGl0ZW1zPVtdLGFzVGV4dD1jZmcucmVzdWx0QXNTdHJpbmc9PT10cnVlJiYhX2hhc0ZvY3VzO21zLnNlbGVjdGlvbkNvbnRhaW5lci5maW5kKFwiLm1zLXNlbC1pdGVtXCIpLnJlbW92ZSgpO2lmKG1zLl92YWx1ZUNvbnRhaW5lciE9PXVuZGVmaW5lZCl7bXMuX3ZhbHVlQ29udGFpbmVyLnJlbW92ZSgpfSQuZWFjaChfc2VsZWN0aW9uLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgc2VsZWN0ZWRJdGVtRWwsZGVsSXRlbUVsLHNlbGVjdGVkSXRlbUh0bWw9Y2ZnLnNlbGVjdGlvblJlbmRlcmVyIT09bnVsbD9jZmcuc2VsZWN0aW9uUmVuZGVyZXIuY2FsbChyZWYsdmFsdWUpOnZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO3ZhciB2YWxpZENscz1zZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0odmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF0pP1wiXCI6XCIgbXMtc2VsLWludmFsaWRcIjtpZihhc1RleHQ9PT10cnVlKXtzZWxlY3RlZEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1pdGVtIG1zLXNlbC10ZXh0IFwiK2NmZy5zZWxlY3Rpb25DbHMrdmFsaWRDbHMsaHRtbDpzZWxlY3RlZEl0ZW1IdG1sKyhpbmRleD09PV9zZWxlY3Rpb24ubGVuZ3RoLTE/XCJcIjpjZmcucmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXIpfSkuZGF0YShcImpzb25cIix2YWx1ZSl9ZWxzZXtzZWxlY3RlZEl0ZW1FbD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1pdGVtIFwiK2NmZy5zZWxlY3Rpb25DbHMrdmFsaWRDbHMsaHRtbDpzZWxlY3RlZEl0ZW1IdG1sfSkuZGF0YShcImpzb25cIix2YWx1ZSk7aWYoY2ZnLmRpc2FibGVkPT09ZmFsc2Upe2RlbEl0ZW1FbD0kKFwiPHNwYW4vPlwiLHtcImNsYXNzXCI6XCJtcy1jbG9zZS1idG5cIn0pLmRhdGEoXCJqc29uXCIsdmFsdWUpLmFwcGVuZFRvKHNlbGVjdGVkSXRlbUVsKTtkZWxJdGVtRWwuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UYWdUcmlnZ2VyQ2xpY2sscmVmKSl9fWl0ZW1zLnB1c2goc2VsZWN0ZWRJdGVtRWwpfSk7bXMuc2VsZWN0aW9uQ29udGFpbmVyLnByZXBlbmQoaXRlbXMpO21zLl92YWx1ZUNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse3N0eWxlOlwiZGlzcGxheTogbm9uZTtcIn0pOyQuZWFjaChtcy5nZXRWYWx1ZSgpLGZ1bmN0aW9uKGksdmFsKXt2YXIgZWw9JChcIjxpbnB1dC8+XCIse3R5cGU6XCJoaWRkZW5cIixuYW1lOmNmZy5uYW1lLHZhbHVlOnZhbH0pO2VsLmFwcGVuZFRvKG1zLl92YWx1ZUNvbnRhaW5lcil9KTttcy5fdmFsdWVDb250YWluZXIuYXBwZW5kVG8obXMuc2VsZWN0aW9uQ29udGFpbmVyKTtpZihjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJiFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5pbnB1dC53aWR0aCgwKTtpbnB1dE9mZnNldD1tcy5pbnB1dC5vZmZzZXQoKS5sZWZ0LW1zLnNlbGVjdGlvbkNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0O3c9bXMuY29udGFpbmVyLndpZHRoKCktaW5wdXRPZmZzZXQtNDI7bXMuaW5wdXQud2lkdGgodyl9aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2V7bXMuaGVscGVyLmhpZGUoKX19LF9zZWxlY3RJdGVtOmZ1bmN0aW9uKGl0ZW0pe2lmKGNmZy5tYXhTZWxlY3Rpb249PT0xKXtfc2VsZWN0aW9uPVtdfW1zLmFkZFRvU2VsZWN0aW9uKGl0ZW0uZGF0YShcImpzb25cIikpO2l0ZW0ucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7aWYoY2ZnLmV4cGFuZE9uRm9jdXM9PT1mYWxzZXx8X3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXttcy5jb2xsYXBzZSgpfWlmKCFfaGFzRm9jdXMpe21zLmlucHV0LmZvY3VzKCl9ZWxzZSBpZihfaGFzRm9jdXMmJihjZmcuZXhwYW5kT25Gb2N1c3x8X2N0cmxEb3duKSl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7aWYoX2N0cmxEb3duKXttcy5leHBhbmQoKX19fSxfc29ydEFuZFRyaW06ZnVuY3Rpb24oZGF0YSl7dmFyIHE9bXMuZ2V0UmF3VmFsdWUoKSxmaWx0ZXJlZD1bXSxuZXdTdWdnZXN0aW9ucz1bXSxzZWxlY3RlZFZhbHVlcz1tcy5nZXRWYWx1ZSgpO2lmKHEubGVuZ3RoPjApeyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LG9iail7dmFyIG5hbWU9b2JqW2NmZy5kaXNwbGF5RmllbGRdO2lmKGNmZy5tYXRjaENhc2U9PT10cnVlJiZuYW1lLmluZGV4T2YocSk+LTF8fGNmZy5tYXRjaENhc2U9PT1mYWxzZSYmbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKT4tMSl7aWYoY2ZnLnN0cmljdFN1Z2dlc3Q9PT1mYWxzZXx8bmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKT09PTApe2ZpbHRlcmVkLnB1c2gob2JqKX19fSl9ZWxzZXtmaWx0ZXJlZD1kYXRhfSQuZWFjaChmaWx0ZXJlZCxmdW5jdGlvbihpbmRleCxvYmope2lmKGNmZy5hbGxvd0R1cGxpY2F0ZXN8fCQuaW5BcnJheShvYmpbY2ZnLnZhbHVlRmllbGRdLHNlbGVjdGVkVmFsdWVzKT09PS0xKXtuZXdTdWdnZXN0aW9ucy5wdXNoKG9iail9fSk7aWYoY2ZnLnNvcnRPcmRlciE9PW51bGwpe25ld1N1Z2dlc3Rpb25zLnNvcnQoZnVuY3Rpb24oYSxiKXtpZihhW2NmZy5zb3J0T3JkZXJdPGJbY2ZnLnNvcnRPcmRlcl0pe3JldHVybiBjZmcuc29ydERpcj09PVwiYXNjXCI/LTE6MX1pZihhW2NmZy5zb3J0T3JkZXJdPmJbY2ZnLnNvcnRPcmRlcl0pe3JldHVybiBjZmcuc29ydERpcj09PVwiYXNjXCI/MTotMX1yZXR1cm4gMH0pfWlmKGNmZy5tYXhTdWdnZXN0aW9ucyYmY2ZnLm1heFN1Z2dlc3Rpb25zPjApe25ld1N1Z2dlc3Rpb25zPW5ld1N1Z2dlc3Rpb25zLnNsaWNlKDAsY2ZnLm1heFN1Z2dlc3Rpb25zKX1yZXR1cm4gbmV3U3VnZ2VzdGlvbnN9LF9ncm91cDpmdW5jdGlvbihkYXRhKXtpZihjZmcuZ3JvdXBCeSE9PW51bGwpe19ncm91cHM9e307JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBwcm9wcz1jZmcuZ3JvdXBCeS5pbmRleE9mKFwiLlwiKT4tMT9jZmcuZ3JvdXBCeS5zcGxpdChcIi5cIik6Y2ZnLmdyb3VwQnk7dmFyIHByb3A9dmFsdWVbY2ZnLmdyb3VwQnldO2lmKHR5cGVvZiBwcm9wcyE9XCJzdHJpbmdcIil7cHJvcD12YWx1ZTt3aGlsZShwcm9wcy5sZW5ndGg+MCl7cHJvcD1wcm9wW3Byb3BzLnNoaWZ0KCldfX1pZihfZ3JvdXBzW3Byb3BdPT09dW5kZWZpbmVkKXtfZ3JvdXBzW3Byb3BdPXt0aXRsZTpwcm9wLGl0ZW1zOlt2YWx1ZV19fWVsc2V7X2dyb3Vwc1twcm9wXS5pdGVtcy5wdXNoKHZhbHVlKX19KX1yZXR1cm4gZGF0YX0sX3VwZGF0ZUhlbHBlcjpmdW5jdGlvbihodG1sKXttcy5oZWxwZXIuaHRtbChodG1sKTtpZighbXMuaGVscGVyLmlzKFwiOnZpc2libGVcIikpe21zLmhlbHBlci5mYWRlSW4oKX19LF92YWxpZGF0ZVNpbmdsZUl0ZW06ZnVuY3Rpb24odmFsdWUpe2lmKGNmZy52cmVnZXghPT1udWxsJiZjZmcudnJlZ2V4IGluc3RhbmNlb2YgUmVnRXhwKXtyZXR1cm4gY2ZnLnZyZWdleC50ZXN0KHZhbHVlKX1lbHNlIGlmKGNmZy52dHlwZSE9PW51bGwpe3N3aXRjaChjZmcudnR5cGUpe2Nhc2VcImFscGhhXCI6cmV0dXJuL15bYS16QS1aX10rJC8udGVzdCh2YWx1ZSk7Y2FzZVwiYWxwaGFudW1cIjpyZXR1cm4vXlthLXpBLVowLTlfXSskLy50ZXN0KHZhbHVlKTtjYXNlXCJlbWFpbFwiOnJldHVybi9eKFxcdyspKFtcXC0rLl1bXFx3XSspKkAoXFx3W1xcLVxcd10qXFwuKXsxLDV9KFtBLVphLXpdKXsyLDZ9JC8udGVzdCh2YWx1ZSk7Y2FzZVwidXJsXCI6cmV0dXJuLygoKF5odHRwcz8pfCheZnRwKSk6XFwvXFwvKFtcXC1cXHddK1xcLikrXFx3ezIsM30oXFwvWyVcXC1cXHddKyhcXC5cXHd7Mix9KT8pKigoW1xcd1xcLVxcLlxcP1xcXFxcXC8rQCYjO2B+PSUhXSopKFxcLlxcd3syLH0pPykqXFwvPykvaS50ZXN0KHZhbHVlKTtjYXNlXCJpcGFkZHJlc3NcIjpyZXR1cm4vXlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9JC8udGVzdCh2YWx1ZSl9fXJldHVybiB0cnVlfX07dmFyIGhhbmRsZXJzPXtfb25CbHVyOmZ1bmN0aW9uKCl7bXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKFwibXMtY3RuLWZvY3VzXCIpO21zLmNvbGxhcHNlKCk7X2hhc0ZvY3VzPWZhbHNlO2lmKG1zLmdldFJhd1ZhbHVlKCkhPT1cIlwiJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PXRydWUpe3ZhciBvYmo9e307b2JqW2NmZy5kaXNwbGF5RmllbGRdPW9ialtjZmcudmFsdWVGaWVsZF09bXMuZ2V0UmF3VmFsdWUoKS50cmltKCk7bXMuYWRkVG9TZWxlY3Rpb24ob2JqKX1zZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtpZihtcy5pc1ZhbGlkKCk9PT1mYWxzZSl7bXMuY29udGFpbmVyLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKX1lbHNlIGlmKG1zLmlucHV0LnZhbCgpIT09XCJcIiYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT1mYWxzZSl7bXMuZW1wdHkoKTtzZWxmLl91cGRhdGVIZWxwZXIoXCJcIil9JChtcykudHJpZ2dlcihcImJsdXJcIixbbXNdKX0sX29uQ29tYm9JdGVtTW91c2VPdmVyOmZ1bmN0aW9uKGUpe3ZhciB0YXJnZXQ9JChlLmN1cnJlbnRUYXJnZXQpO2lmKCF0YXJnZXQuaGFzQ2xhc3MoXCJtcy1yZXMtaXRlbS1kaXNhYmxlZFwiKSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTt0YXJnZXQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9fSxfb25Db21ib0l0ZW1TZWxlY3RlZDpmdW5jdGlvbihlKXt2YXIgdGFyZ2V0PSQoZS5jdXJyZW50VGFyZ2V0KTtpZighdGFyZ2V0Lmhhc0NsYXNzKFwibXMtcmVzLWl0ZW0tZGlzYWJsZWRcIikpe3NlbGYuX3NlbGVjdEl0ZW0oJChlLmN1cnJlbnRUYXJnZXQpKX19LF9vbkZvY3VzOmZ1bmN0aW9uKCl7bXMuaW5wdXQuZm9jdXMoKX0sX29uSW5wdXRDbGljazpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiZfaGFzRm9jdXMpe2lmKGNmZy50b2dnbGVPbkNsaWNrPT09dHJ1ZSl7aWYoY2ZnLmV4cGFuZGVkKXttcy5jb2xsYXBzZSgpfWVsc2V7bXMuZXhwYW5kKCl9fX19LF9vbklucHV0Rm9jdXM6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmIV9oYXNGb2N1cyl7X2hhc0ZvY3VzPXRydWU7bXMuY29udGFpbmVyLmFkZENsYXNzKFwibXMtY3RuLWZvY3VzXCIpO21zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7dmFyIGN1ckxlbmd0aD1tcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtpZihjZmcuZXhwYW5kT25Gb2N1cz09PXRydWUpe21zLmV4cGFuZCgpfWlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsX3NlbGVjdGlvbi5sZW5ndGgpKX1lbHNlIGlmKGN1ckxlbmd0aDxjZmcubWluQ2hhcnMpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWN1ckxlbmd0aCkpfXNlbGYuX3JlbmRlclNlbGVjdGlvbigpOyQobXMpLnRyaWdnZXIoXCJmb2N1c1wiLFttc10pfX0sX29uS2V5RG93bjpmdW5jdGlvbihlKXt2YXIgYWN0aXZlPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpLGZyZWVJbnB1dD1tcy5pbnB1dC52YWwoKTskKG1zKS50cmlnZ2VyKFwia2V5ZG93blwiLFttcyxlXSk7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuVEFCJiYoY2ZnLnVzZVRhYktleT09PWZhbHNlfHxjZmcudXNlVGFiS2V5PT09dHJ1ZSYmYWN0aXZlLmxlbmd0aD09PTAmJm1zLmlucHV0LnZhbCgpLmxlbmd0aD09PTApKXtoYW5kbGVycy5fb25CbHVyKCk7cmV0dXJufXN3aXRjaChlLmtleUNvZGUpe2Nhc2UgS0VZQ09ERVMuQkFDS1NQQUNFOmlmKGZyZWVJbnB1dC5sZW5ndGg9PT0wJiZtcy5nZXRTZWxlY3Rpb24oKS5sZW5ndGg+MCYmY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiKXtfc2VsZWN0aW9uLnBvcCgpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpOyQobXMpLnRyaWdnZXIoXCJzZWxlY3Rpb25jaGFuZ2VcIixbbXMsbXMuZ2V0U2VsZWN0aW9uKCldKTttcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJm1zLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpO21zLmlucHV0LmZvY3VzKCk7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuVEFCOmNhc2UgS0VZQ09ERVMuRVNDOmUucHJldmVudERlZmF1bHQoKTticmVhaztjYXNlIEtFWUNPREVTLkVOVEVSOmlmKGZyZWVJbnB1dCE9PVwiXCJ8fGNmZy5leHBhbmRlZCl7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuQ09NTUE6aWYoY2ZnLnVzZUNvbW1hS2V5PT09dHJ1ZSl7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrO2Nhc2UgS0VZQ09ERVMuQ1RSTDpfY3RybERvd249dHJ1ZTticmVhaztjYXNlIEtFWUNPREVTLkRPV05BUlJPVzplLnByZXZlbnREZWZhdWx0KCk7c2VsZi5fbW92ZVNlbGVjdGVkUm93KFwiZG93blwiKTticmVhaztjYXNlIEtFWUNPREVTLlVQQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO3NlbGYuX21vdmVTZWxlY3RlZFJvdyhcInVwXCIpO2JyZWFrO2RlZmF1bHQ6aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWt9fSxfb25LZXlVcDpmdW5jdGlvbihlKXt2YXIgZnJlZUlucHV0PW1zLmdldFJhd1ZhbHVlKCksaW5wdXRWYWxpZD0kLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aD4wJiYoIWNmZy5tYXhFbnRyeUxlbmd0aHx8JC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGg8PWNmZy5tYXhFbnRyeUxlbmd0aCksc2VsZWN0ZWQsb2JqPXt9OyQobXMpLnRyaWdnZXIoXCJrZXl1cFwiLFttcyxlXSk7Y2xlYXJUaW1lb3V0KF90aW1lcik7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuRVNDJiZjZmcuZXhwYW5kZWQpe21zLmNvbWJvYm94LmhpZGUoKX1pZihlLmtleUNvZGU9PT1LRVlDT0RFUy5UQUImJmNmZy51c2VUYWJLZXk9PT1mYWxzZXx8ZS5rZXlDb2RlPktFWUNPREVTLkVOVEVSJiZlLmtleUNvZGU8S0VZQ09ERVMuU1BBQ0Upe2lmKGUua2V5Q29kZT09PUtFWUNPREVTLkNUUkwpe19jdHJsRG93bj1mYWxzZX1yZXR1cm59c3dpdGNoKGUua2V5Q29kZSl7Y2FzZSBLRVlDT0RFUy5VUEFSUk9XOmNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOmUucHJldmVudERlZmF1bHQoKTticmVhaztjYXNlIEtFWUNPREVTLkVOVEVSOmNhc2UgS0VZQ09ERVMuVEFCOmNhc2UgS0VZQ09ERVMuQ09NTUE6aWYoZS5rZXlDb2RlIT09S0VZQ09ERVMuQ09NTUF8fGNmZy51c2VDb21tYUtleT09PXRydWUpe2UucHJldmVudERlZmF1bHQoKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXtzZWxlY3RlZD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKTtpZihzZWxlY3RlZC5sZW5ndGg+MCl7c2VsZi5fc2VsZWN0SXRlbShzZWxlY3RlZCk7cmV0dXJufX1pZihpbnB1dFZhbGlkPT09dHJ1ZSYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT10cnVlKXtvYmpbY2ZnLmRpc3BsYXlGaWVsZF09b2JqW2NmZy52YWx1ZUZpZWxkXT1mcmVlSW5wdXQudHJpbSgpO21zLmFkZFRvU2VsZWN0aW9uKG9iaik7bXMuY29sbGFwc2UoKTttcy5pbnB1dC5mb2N1cygpfWJyZWFrfWRlZmF1bHQ6aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2V7aWYoZnJlZUlucHV0Lmxlbmd0aDxjZmcubWluQ2hhcnMpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWZyZWVJbnB1dC5sZW5ndGgpKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfX1lbHNlIGlmKGNmZy5tYXhFbnRyeUxlbmd0aCYmZnJlZUlucHV0Lmxlbmd0aD5jZmcubWF4RW50cnlMZW5ndGgpe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4RW50cnlSZW5kZXJlci5jYWxsKHRoaXMsZnJlZUlucHV0Lmxlbmd0aC1jZmcubWF4RW50cnlMZW5ndGgpKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfX1lbHNle21zLmhlbHBlci5oaWRlKCk7aWYoY2ZnLm1pbkNoYXJzPD1mcmVlSW5wdXQubGVuZ3RoKXtfdGltZXI9c2V0VGltZW91dChmdW5jdGlvbigpe2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfWVsc2V7bXMuZXhwYW5kKCl9fSxjZmcudHlwZURlbGF5KX19fWJyZWFrfX0sX29uVGFnVHJpZ2dlckNsaWNrOmZ1bmN0aW9uKGUpe21zLnJlbW92ZUZyb21TZWxlY3Rpb24oJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoXCJqc29uXCIpKX0sX29uVHJpZ2dlckNsaWNrOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJiEoY2ZnLmV4cGFuZE9uRm9jdXM9PT10cnVlJiZfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pKXskKG1zKS50cmlnZ2VyKFwidHJpZ2dlcmNsaWNrXCIsW21zXSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7bXMuY29sbGFwc2UoKX1lbHNle3ZhciBjdXJMZW5ndGg9bXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7aWYoY3VyTGVuZ3RoPj1jZmcubWluQ2hhcnMpe21zLmlucHV0LmZvY3VzKCk7bXMuZXhwYW5kKCl9ZWxzZXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLGNmZy5taW5DaGFycy1jdXJMZW5ndGgpKX19fX0sX29uV2luZG93UmVzaXplZDpmdW5jdGlvbigpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpfX07aWYoZWxlbWVudCE9PW51bGwpe3NlbGYuX3JlbmRlcihlbGVtZW50KX19OyQuZm4ubWFnaWNTdWdnZXN0PWZ1bmN0aW9uKG9wdGlvbnMpe3ZhciBvYmo9JCh0aGlzKTtpZihvYmouc2l6ZSgpPT09MSYmb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIikpe3JldHVybiBvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKX1vYmouZWFjaChmdW5jdGlvbihpKXt2YXIgY250cj0kKHRoaXMpO2lmKGNudHIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKSl7cmV0dXJufWlmKHRoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PVwic2VsZWN0XCIpe29wdGlvbnMuZGF0YT1bXTtvcHRpb25zLnZhbHVlPVtdOyQuZWFjaCh0aGlzLmNoaWxkcmVuLGZ1bmN0aW9uKGluZGV4LGNoaWxkKXtpZihjaGlsZC5ub2RlTmFtZSYmY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PVwib3B0aW9uXCIpe29wdGlvbnMuZGF0YS5wdXNoKHtpZDpjaGlsZC52YWx1ZSxuYW1lOmNoaWxkLnRleHR9KTtpZigkKGNoaWxkKS5hdHRyKFwic2VsZWN0ZWRcIikpe29wdGlvbnMudmFsdWUucHVzaChjaGlsZC52YWx1ZSl9fX0pfXZhciBkZWY9e307JC5lYWNoKHRoaXMuYXR0cmlidXRlcyxmdW5jdGlvbihpLGF0dCl7ZGVmW2F0dC5uYW1lXT1hdHQubmFtZT09PVwidmFsdWVcIiYmYXR0LnZhbHVlIT09XCJcIj9KU09OLnBhcnNlKGF0dC52YWx1ZSk6YXR0LnZhbHVlfSk7dmFyIGZpZWxkPW5ldyBNYWdpY1N1Z2dlc3QodGhpcywkLmV4dGVuZChbXSwkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cyxvcHRpb25zLGRlZikpO2NudHIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiLGZpZWxkKTtmaWVsZC5jb250YWluZXIuZGF0YShcIm1hZ2ljU3VnZ2VzdFwiLGZpZWxkKX0pO2lmKG9iai5zaXplKCk9PT0xKXtyZXR1cm4gb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIil9cmV0dXJuIG9ian07JC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHM9e319KShqUXVlcnkpOyIsIi8qKlxuICogTXVsdGlwbGUgU2VsZWN0aW9uIENvbXBvbmVudCBmb3IgQm9vdHN0cmFwXG4gKiBDaGVjayBuaWNvbGFzYml6ZS5naXRodWIuaW8vbWFnaWNzdWdnZXN0LyBmb3IgbGF0ZXN0IHVwZGF0ZXMuXG4gKlxuICogQXV0aG9yOiAgICAgICBOaWNvbGFzIEJpemVcbiAqIENyZWF0ZWQ6ICAgICAgRmViIDh0aCAyMDEzXG4gKiBMYXN0IFVwZGF0ZWQ6IE9jdCAxNnRoIDIwMTRcbiAqIFZlcnNpb246ICAgICAgMi4xLjRcbiAqIExpY2VuY2U6ICAgICAgTWFnaWNTdWdnZXN0IGlzIGxpY2VuY2VkIHVuZGVyIE1JVCBsaWNlbmNlIChodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUKVxuICovXG4oZnVuY3Rpb24oJClcbntcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgTWFnaWNTdWdnZXN0ID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucylcbiAgICB7XG4gICAgICAgIHZhciBtcyA9IHRoaXM7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluaXRpYWxpemVzIHRoZSBNYWdpY1N1Z2dlc3QgY29tcG9uZW50XG4gICAgICAgICAqL1xuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAvKioqKioqKioqKiAgQ09ORklHVVJBVElPTiBQUk9QRVJUSUVTICoqKioqKioqKioqKi9cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVzdHJpY3RzIG9yIGFsbG93cyB0aGUgdXNlciB0byB2YWxpZGF0ZSB0eXBlZCBlbnRyaWVzLlxuICAgICAgICAgICAgICogRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWxsb3dGcmVlRW50cmllczogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXN0cmljdHMgb3IgYWxsb3dzIHRoZSB1c2VyIHRvIGFkZCB0aGUgc2FtZSBlbnRyeSBtb3JlIHRoYW4gb25jZVxuICAgICAgICAgICAgICogRGVmYXVsdHMgdG8gZmFsc2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFsbG93RHVwbGljYXRlczogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBjb25maWcgb2JqZWN0IHBhc3NlZCB0byBlYWNoICQuYWpheCBjYWxsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFqYXhDb25maWc6IHt9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIGEgc2luZ2xlIHN1Z2dlc3Rpb24gY29tZXMgb3V0LCBpdCBpcyBwcmVzZWxlY3RlZC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYXV0b1NlbGVjdDogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBdXRvIHNlbGVjdCB0aGUgZmlyc3QgbWF0Y2hpbmcgaXRlbSB3aXRoIG11bHRpcGxlIGl0ZW1zIHNob3duXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdEZpcnN0OiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbGxvdyBjdXN0b21pemF0aW9uIG9mIHF1ZXJ5IHBhcmFtZXRlclxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBxdWVyeVBhcmFtOiAncXVlcnknLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBhamF4IHJlcXVlc3QgaXMgc2VudCwgc2ltaWxhciB0byBqUXVlcnlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oKXsgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBDU1MgY2xhc3MgdG8gYXBwbHkgdG8gdGhlIGZpZWxkJ3MgdW5kZXJseWluZyBlbGVtZW50LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbHM6ICcnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEpTT04gRGF0YSBzb3VyY2UgdXNlZCB0byBwb3B1bGF0ZSB0aGUgY29tYm8gYm94LiAzIG9wdGlvbnMgYXJlIGF2YWlsYWJsZSBoZXJlOlxuICAgICAgICAgICAgICogTm8gRGF0YSBTb3VyY2UgKGRlZmF1bHQpXG4gICAgICAgICAgICAgKiAgICBXaGVuIGxlZnQgbnVsbCwgdGhlIGNvbWJvIGJveCB3aWxsIG5vdCBzdWdnZXN0IGFueXRoaW5nLiBJdCBjYW4gc3RpbGwgZW5hYmxlIHRoZSB1c2VyIHRvIGVudGVyXG4gICAgICAgICAgICAgKiAgICBtdWx0aXBsZSBlbnRyaWVzIGlmIGFsbG93RnJlZUVudHJpZXMgaXMgKiBzZXQgdG8gdHJ1ZSAoZGVmYXVsdCkuXG4gICAgICAgICAgICAgKiBTdGF0aWMgU291cmNlXG4gICAgICAgICAgICAgKiAgICBZb3UgY2FuIHBhc3MgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzLCBhbiBhcnJheSBvZiBzdHJpbmdzIG9yIGV2ZW4gYSBzaW5nbGUgQ1NWIHN0cmluZyBhcyB0aGVcbiAgICAgICAgICAgICAqICAgIGRhdGEgc291cmNlLkZvciBleC4gZGF0YTogWyoge2lkOjAsbmFtZTpcIlBhcmlzXCJ9LCB7aWQ6IDEsIG5hbWU6IFwiTmV3IFlvcmtcIn1dXG4gICAgICAgICAgICAgKiAgICBZb3UgY2FuIGFsc28gcGFzcyBhbnkganNvbiBvYmplY3Qgd2l0aCB0aGUgcmVzdWx0cyBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBqc29uIGFycmF5LlxuICAgICAgICAgICAgICogVXJsXG4gICAgICAgICAgICAgKiAgICAgWW91IGNhbiBwYXNzIHRoZSB1cmwgZnJvbSB3aGljaCB0aGUgY29tcG9uZW50IHdpbGwgZmV0Y2ggaXRzIEpTT04gZGF0YS5EYXRhIHdpbGwgYmUgZmV0Y2hlZFxuICAgICAgICAgICAgICogICAgIHVzaW5nIGEgUE9TVCBhamF4IHJlcXVlc3QgdGhhdCB3aWxsICogaW5jbHVkZSB0aGUgZW50ZXJlZCB0ZXh0IGFzICdxdWVyeScgcGFyYW1ldGVyLiBUaGUgcmVzdWx0c1xuICAgICAgICAgICAgICogICAgIGZldGNoZWQgZnJvbSB0aGUgc2VydmVyIGNhbiBiZTpcbiAgICAgICAgICAgICAqICAgICAtIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyAoZXg6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV0pXG4gICAgICAgICAgICAgKiAgICAgLSBhIHN0cmluZyBjb250YWluaW5nIGFuIGFycmF5IG9mIEpTT04gb2JqZWN0cyByZWFkeSB0byBiZSBwYXJzZWQgKGV4OiBcIlt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV1cIilcbiAgICAgICAgICAgICAqICAgICAtIGEgSlNPTiBvYmplY3Qgd2hvc2UgZGF0YSB3aWxsIGJlIGNvbnRhaW5lZCBpbiB0aGUgcmVzdWx0cyBwcm9wZXJ0eVxuICAgICAgICAgICAgICogICAgICAoZXg6IHtyZXN1bHRzOiBbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dXG4gICAgICAgICAgICAgKiBGdW5jdGlvblxuICAgICAgICAgICAgICogICAgIFlvdSBjYW4gcGFzcyBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzICAoZXg6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV0pXG4gICAgICAgICAgICAgKiAgICAgVGhlIGZ1bmN0aW9uIGNhbiByZXR1cm4gdGhlIEpTT04gZGF0YSBvciBpdCBjYW4gdXNlIHRoZSBmaXJzdCBhcmd1bWVudCBhcyBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIGRhdGEuXG4gICAgICAgICAgICAgKiAgICAgT25seSBvbmUgKGNhbGxiYWNrIGZ1bmN0aW9uIG9yIHJldHVybiB2YWx1ZSkgaXMgbmVlZGVkIGZvciB0aGUgZnVuY3Rpb24gdG8gc3VjY2VlZC5cbiAgICAgICAgICAgICAqICAgICBTZWUgdGhlIGZvbGxvd2luZyBleGFtcGxlOlxuICAgICAgICAgICAgICogICAgIGZ1bmN0aW9uIChyZXNwb25zZSkgeyB2YXIgbXlqc29uID0gW3tuYW1lOiAndGVzdCcsIGlkOiAxfV07IHJlc3BvbnNlKG15anNvbik7IHJldHVybiBteWpzb247IH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGF0YTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgdG8gdGhlIGFqYXggY2FsbFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXRhVXJsUGFyYW1zOiB7fSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTdGFydCB0aGUgY29tcG9uZW50IGluIGEgZGlzYWJsZWQgc3RhdGUuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpc2FibGVkOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IHRoYXQgZGVmaW5lcyB0aGUgZGlzYWJsZWQgYmVoYXZpb3VyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRpc2FibGVkRmllbGQ6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSBkaXNwbGF5ZWQgaW4gdGhlIGNvbWJvIGxpc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzcGxheUZpZWxkOiAnbmFtZScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIGZhbHNlIGlmIHlvdSBvbmx5IHdhbnQgbW91c2UgaW50ZXJhY3Rpb24uIEluIHRoYXQgY2FzZSB0aGUgY29tYm8gd2lsbFxuICAgICAgICAgICAgICogYXV0b21hdGljYWxseSBleHBhbmQgb24gZm9jdXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGVkaXRhYmxlOiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCBzdGFydGluZyBzdGF0ZSBmb3IgY29tYm8uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGV4cGFuZGVkOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBdXRvbWF0aWNhbGx5IGV4cGFuZHMgY29tYm8gb24gZm9jdXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGV4cGFuZE9uRm9jdXM6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEpTT04gcHJvcGVydHkgYnkgd2hpY2ggdGhlIGxpc3Qgc2hvdWxkIGJlIGdyb3VwZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ3JvdXBCeTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBoaWRlIHRoZSB0cmlnZ2VyIG9uIHRoZSByaWdodFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBoaWRlVHJpZ2dlcjogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gaGlnaGxpZ2h0IHNlYXJjaCBpbnB1dCB3aXRoaW4gZGlzcGxheWVkIHN1Z2dlc3Rpb25zXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBJRCBmb3IgdGhpcyBjb21wb25lbnRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWQ6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBjbGFzcyB0aGF0IGlzIGFkZGVkIHRvIHRoZSBpbmZvIG1lc3NhZ2UgYXBwZWFyaW5nIG9uIHRoZSB0b3AtcmlnaHQgcGFydCBvZiB0aGUgY29tcG9uZW50XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluZm9Nc2dDbHM6ICcnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBwYXNzZWQgb3V0IHRvIHRoZSBJTlBVVCB0YWcuIEVuYWJsZXMgdXNhZ2Ugb2YgQW5ndWxhckpTJ3MgY3VzdG9tIHRhZ3MgZm9yIGV4LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnB1dENmZzoge30sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIGNsYXNzIHRoYXQgaXMgYXBwbGllZCB0byBzaG93IHRoYXQgdGhlIGZpZWxkIGlzIGludmFsaWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW52YWxpZENsczogJ21zLWludicsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gZmlsdGVyIGRhdGEgcmVzdWx0cyBhY2NvcmRpbmcgdG8gY2FzZS4gVXNlbGVzcyBpZiB0aGUgZGF0YSBpcyBmZXRjaGVkIHJlbW90ZWx5XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1hdGNoQ2FzZTogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogT25jZSBleHBhbmRlZCwgdGhlIGNvbWJvJ3MgaGVpZ2h0IHdpbGwgdGFrZSBhcyBtdWNoIHJvb20gYXMgdGhlICMgb2YgYXZhaWxhYmxlIHJlc3VsdHMuXG4gICAgICAgICAgICAgKiAgICBJbiBjYXNlIHRoZXJlIGFyZSB0b28gbWFueSByZXN1bHRzIGRpc3BsYXllZCwgdGhpcyB3aWxsIGZpeCB0aGUgZHJvcCBkb3duIGhlaWdodC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4RHJvcEhlaWdodDogMjkwLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlZmluZXMgaG93IGxvbmcgdGhlIHVzZXIgZnJlZSBlbnRyeSBjYW4gYmUuIFNldCB0byBudWxsIGZvciBubyBsaW1pdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4RW50cnlMZW5ndGg6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gdGhlIG1heCBlbnRyeSBsZW5ndGggaGFzIGJlZW4gc3VycGFzc2VkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhFbnRyeVJlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdQbGVhc2UgcmVkdWNlIHlvdXIgZW50cnkgYnkgJyArIHYgKyAnIGNoYXJhY3RlcicgKyAodiA+IDEgPyAncyc6JycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgcmVzdWx0cyBkaXNwbGF5ZWQgaW4gdGhlIGNvbWJvIGRyb3AgZG93biBhdCBvbmNlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhTdWdnZXN0aW9uczogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdGhlIHVzZXIgY2FuIHNlbGVjdCBpZiBtdWx0aXBsZSBzZWxlY3Rpb24gaXMgYWxsb3dlZC5cbiAgICAgICAgICAgICAqICAgIFNldCB0byBudWxsIHRvIHJlbW92ZSB0aGUgbGltaXQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFNlbGVjdGlvbjogMTAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gdGhlIG1heCBzZWxlY3Rpb24gYW1vdW50IGhhcyBiZWVuIHJlYWNoZWQuIFRoZSBmdW5jdGlvbiBoYXMgYSBzaW5nbGVcbiAgICAgICAgICAgICAqICAgIHBhcmFtZXRlciB3aGljaCBpcyB0aGUgbnVtYmVyIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhTZWxlY3Rpb25SZW5kZXJlcjogZnVuY3Rpb24odikge1xuICAgICAgICAgICAgICAgIHJldHVybiAnWW91IGNhbm5vdCBjaG9vc2UgbW9yZSB0aGFuICcgKyB2ICsgJyBpdGVtJyArICh2ID4gMSA/ICdzJzonJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtZXRob2QgdXNlZCBieSB0aGUgYWpheCByZXF1ZXN0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgbWluaW11bSBudW1iZXIgb2YgY2hhcmFjdGVycyB0aGUgdXNlciBtdXN0IHR5cGUgYmVmb3JlIHRoZSBjb21ibyBleHBhbmRzIGFuZCBvZmZlcnMgc3VnZ2VzdGlvbnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1pbkNoYXJzOiAwLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIHRoZSBoZWxwZXIgdGV4dCB3aGVuIG5vdCBlbm91Z2ggbGV0dGVycyBhcmUgc2V0LiBUaGUgZnVuY3Rpb24gaGFzIGEgc2luZ2xlXG4gICAgICAgICAgICAgKiAgICBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgcmVxdWlyZWQgYW1vdW50IG9mIGxldHRlcnMgYW5kIHRoZSBjdXJyZW50IG9uZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWluQ2hhcnNSZW5kZXJlcjogZnVuY3Rpb24odikge1xuICAgICAgICAgICAgICAgIHJldHVybiAnUGxlYXNlIHR5cGUgJyArIHYgKyAnIG1vcmUgY2hhcmFjdGVyJyArICh2ID4gMSA/ICdzJzonJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFdoZXRoZXIgb3Igbm90IHNvcnRpbmcgLyBmaWx0ZXJpbmcgc2hvdWxkIGJlIGRvbmUgcmVtb3RlbHkgb3IgbG9jYWxseS5cbiAgICAgICAgICAgICAqIFVzZSBlaXRoZXIgJ2xvY2FsJyBvciAncmVtb3RlJ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtb2RlOiAnbG9jYWwnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBuYW1lIHVzZWQgYXMgYSBmb3JtIGVsZW1lbnQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG5hbWU6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIHRleHQgZGlzcGxheWVkIHdoZW4gdGhlcmUgYXJlIG5vIHN1Z2dlc3Rpb25zLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBub1N1Z2dlc3Rpb25UZXh0OiAnTm8gc3VnZ2VzdGlvbnMnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBkZWZhdWx0IHBsYWNlaG9sZGVyIHRleHQgd2hlbiBub3RoaW5nIGhhcyBiZWVuIGVudGVyZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdUeXBlIG9yIGNsaWNrIGhlcmUnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdXNlZCB0byBkZWZpbmUgaG93IHRoZSBpdGVtcyB3aWxsIGJlIHByZXNlbnRlZCBpbiB0aGUgY29tYm9cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVuZGVyZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogV2hldGhlciBvciBub3QgdGhpcyBmaWVsZCBzaG91bGQgYmUgcmVxdWlyZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIHJlbmRlciBzZWxlY3Rpb24gYXMgYSBkZWxpbWl0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlc3VsdEFzU3RyaW5nOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUZXh0IGRlbGltaXRlciB0byB1c2UgaW4gYSBkZWxpbWl0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXN1bHRBc1N0cmluZ0RlbGltaXRlcjogJywnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCByZXByZXNlbnRzIHRoZSBsaXN0IG9mIHN1Z2dlc3RlZCBvYmplY3RzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlc3VsdHNGaWVsZDogJ3Jlc3VsdHMnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIENTUyBjbGFzcyB0byBhZGQgdG8gYSBzZWxlY3RlZCBpdGVtXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvbkNsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQW4gb3B0aW9uYWwgZWxlbWVudCByZXBsYWNlbWVudCBpbiB3aGljaCB0aGUgc2VsZWN0aW9uIGlzIHJlbmRlcmVkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvbkNvbnRhaW5lcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBXaGVyZSB0aGUgc2VsZWN0ZWQgaXRlbXMgd2lsbCBiZSBkaXNwbGF5ZWQuIE9ubHkgJ3JpZ2h0JywgJ2JvdHRvbScgYW5kICdpbm5lcicgYXJlIHZhbGlkIHZhbHVlc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Rpb25Qb3NpdGlvbjogJ2lubmVyJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHVzZWQgdG8gZGVmaW5lIGhvdyB0aGUgaXRlbXMgd2lsbCBiZSBwcmVzZW50ZWQgaW4gdGhlIHRhZyBsaXN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblJlbmRlcmVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIHN0YWNrIHRoZSBzZWxlY3Rpb25lZCBpdGVtcyB3aGVuIHBvc2l0aW9uZWQgb24gdGhlIGJvdHRvbVxuICAgICAgICAgICAgICogICAgUmVxdWlyZXMgdGhlIHNlbGVjdGlvblBvc2l0aW9uIHRvIGJlIHNldCB0byAnYm90dG9tJ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Rpb25TdGFja2VkOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEaXJlY3Rpb24gdXNlZCBmb3Igc29ydGluZy4gT25seSAnYXNjJyBhbmQgJ2Rlc2MnIGFyZSB2YWxpZCB2YWx1ZXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc29ydERpcjogJ2FzYycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSBmb3IgbG9jYWwgcmVzdWx0IHNvcnRpbmcuXG4gICAgICAgICAgICAgKiAgICBMZWF2ZSBudWxsIGlmIHlvdSBkbyBub3Qgd2lzaCB0aGUgcmVzdWx0cyB0byBiZSBvcmRlcmVkIG9yIGlmIHRoZXkgYXJlIGFscmVhZHkgb3JkZXJlZCByZW1vdGVseS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc29ydE9yZGVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCBzdWdnZXN0aW9ucyB3aWxsIGhhdmUgdG8gc3RhcnQgYnkgdXNlciBpbnB1dCAoYW5kIG5vdCBzaW1wbHkgY29udGFpbiBpdCBhcyBhIHN1YnN0cmluZylcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3RyaWN0U3VnZ2VzdDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ3VzdG9tIHN0eWxlIGFkZGVkIHRvIHRoZSBjb21wb25lbnQgY29udGFpbmVyLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzdHlsZTogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHRoZSBjb21ibyB3aWxsIGV4cGFuZCAvIGNvbGxhcHNlIHdoZW4gY2xpY2tlZCB1cG9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRvZ2dsZU9uQ2xpY2s6IGZhbHNlLFxuXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQW1vdW50IChpbiBtcykgYmV0d2VlbiBrZXlib2FyZCByZWdpc3RlcnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHR5cGVEZWxheTogNDAwLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB0YWIgd29uJ3QgYmx1ciB0aGUgY29tcG9uZW50IGJ1dCB3aWxsIGJlIHJlZ2lzdGVyZWQgYXMgdGhlIEVOVEVSIGtleVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1c2VUYWJLZXk6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB1c2luZyBjb21tYSB3aWxsIHZhbGlkYXRlIHRoZSB1c2VyJ3MgY2hvaWNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVzZUNvbW1hS2V5OiB0cnVlLFxuXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgcmVzdWx0cyB3aWxsIGJlIGRpc3BsYXllZCB3aXRoIGEgemVicmEgdGFibGUgc3R5bGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdXNlWmVicmFTdHlsZTogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogaW5pdGlhbCB2YWx1ZSBmb3IgdGhlIGZpZWxkXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZhbHVlOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIG5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCByZXByZXNlbnRzIGl0cyB1bmRlcmx5aW5nIHZhbHVlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZhbHVlRmllbGQ6ICdpZCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogcmVndWxhciBleHByZXNzaW9uIHRvIHZhbGlkYXRlIHRoZSB2YWx1ZXMgYWdhaW5zdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2cmVnZXg6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogdHlwZSB0byB2YWxpZGF0ZSBhZ2FpbnN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZ0eXBlOiBudWxsXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGNvbmYgPSAkLmV4dGVuZCh7fSxvcHRpb25zKTtcbiAgICAgICAgdmFyIGNmZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgY29uZik7XG5cbiAgICAgICAgLyoqKioqKioqKiogIFBVQkxJQyBNRVRIT0RTICoqKioqKioqKioqKi9cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBvbmUgb3IgbXVsdGlwbGUganNvbiBpdGVtcyB0byB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgICAgICogQHBhcmFtIGl0ZW1zIC0ganNvbiBvYmplY3Qgb3IgYXJyYXkgb2YganNvbiBvYmplY3RzXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcywgaXNTaWxlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghY2ZnLm1heFNlbGVjdGlvbiB8fCBfc2VsZWN0aW9uLmxlbmd0aCA8IGNmZy5tYXhTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoISQuaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMgPSBbaXRlbXNdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgdmFsdWVjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwganNvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLmFsbG93RHVwbGljYXRlcyB8fCAkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sIG1zLmdldFZhbHVlKCkpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5wdXNoKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmKHZhbHVlY2hhbmdlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTaWxlbnQgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW3RoaXMsIHRoaXMuZ2V0U2VsZWN0aW9uKCldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCAoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmIHRoaXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXNTaWxlbnQgLSAob3B0aW9uYWwpIHNldCB0byB0cnVlIHRvIHN1cHByZXNzICdzZWxlY3Rpb25jaGFuZ2UnIGV2ZW50IGZyb20gYmVpbmcgdHJpZ2dlcmVkXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oaXNTaWxlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbihfc2VsZWN0aW9uLnNsaWNlKDApLCBpc1NpbGVudCk7IC8vIGNsb25lIGFycmF5IHRvIGF2b2lkIGNvbmN1cnJlbmN5IGlzc3Vlc1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb2xsYXBzZSB0aGUgZHJvcCBkb3duIHBhcnQgb2YgdGhlIGNvbWJvXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbGxhcHNlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21ib2JveC5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ2NvbGxhcHNlJywgW3RoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHRoZSBjb21wb25lbnQgaW4gYSBkaXNhYmxlZCBzdGF0ZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGlzYWJsZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuYWRkQ2xhc3MoJ21zLWN0bi1kaXNhYmxlZCcpO1xuICAgICAgICAgICAgY2ZnLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVtcHRpZXMgb3V0IHRoZSBjb21ibyB1c2VyIHRleHRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1wdHkgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5pbnB1dC52YWwoJycpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgdGhlIGNvbXBvbmVudCBpbiBhIGVuYWJsZSBzdGF0ZS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW5hYmxlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5yZW1vdmVDbGFzcygnbXMtY3RuLWRpc2FibGVkJyk7XG4gICAgICAgICAgICBjZmcuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFeHBhbmQgdGhlIGRyb3AgZHJvd24gcGFydCBvZiB0aGUgY29tYm8uXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmV4cGFuZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCFjZmcuZXhwYW5kZWQgJiYgKHRoaXMuaW5wdXQudmFsKCkubGVuZ3RoID49IGNmZy5taW5DaGFycyB8fCB0aGlzLmNvbWJvYm94LmNoaWxkcmVuKCkuc2l6ZSgpID4gMCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWJvYm94LmFwcGVuZFRvKHRoaXMuY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignZXhwYW5kJywgW3RoaXNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmUgY29tcG9uZW50IGVuYWJsZWQgc3RhdHVzXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzRGlzYWJsZWQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBjZmcuZGlzYWJsZWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBmaWVsZCBpcyB2YWxpZCBvciBub3RcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNWYWxpZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHZhbGlkID0gY2ZnLnJlcXVpcmVkID09PSBmYWxzZSB8fCBfc2VsZWN0aW9uLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBpZihjZmcudnR5cGUgfHwgY2ZnLnZyZWdleCl7XG4gICAgICAgICAgICAgICAgJC5lYWNoKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKGluZGV4LCBpdGVtKXtcbiAgICAgICAgICAgICAgICAgICAgdmFsaWQgPSB2YWxpZCAmJiBzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0oaXRlbVtjZmcudmFsdWVGaWVsZF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhbGlkO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIHRoZSBkYXRhIHBhcmFtcyBmb3IgY3VycmVudCBhamF4IHJlcXVlc3RcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0RGF0YVVybFBhcmFtcyA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5kYXRhVXJsUGFyYW1zO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIHRoZSBuYW1lIGdpdmVuIHRvIHRoZSBmb3JtIGlucHV0XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldE5hbWUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBjZmcubmFtZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0cmlldmUgYW4gYXJyYXkgb2Ygc2VsZWN0ZWQganNvbiBvYmplY3RzXG4gICAgICAgICAqIEByZXR1cm4ge0FycmF5fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiBfc2VsZWN0aW9uO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSB0aGUgY3VycmVudCB0ZXh0IGVudGVyZWQgYnkgdGhlIHVzZXJcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0UmF3VmFsdWUgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIG1zLmlucHV0LnZhbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBhbiBhcnJheSBvZiBzZWxlY3RlZCB2YWx1ZXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0VmFsdWUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkLm1hcChfc2VsZWN0aW9uLCBmdW5jdGlvbihvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9bY2ZnLnZhbHVlRmllbGRdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBvbmUgb3IgbXVsdGlwbGVzIGpzb24gaXRlbXMgZnJvbSB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgICAgICogQHBhcmFtIGl0ZW1zIC0ganNvbiBvYmplY3Qgb3IgYXJyYXkgb2YganNvbiBvYmplY3RzXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zLCBpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCEkLmlzQXJyYXkoaXRlbXMpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMgPSBbaXRlbXNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZhbHVlY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwganNvbikge1xuICAgICAgICAgICAgICAgIHZhciBpID0gJC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLCBtcy5nZXRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24uc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZWNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHZhbHVlY2hhbmdlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmKGlzU2lsZW50ICE9PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbdGhpcywgdGhpcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyl7XG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXQgY3VycmVudCBkYXRhXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldERhdGEgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIF9jYkRhdGE7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB1cCBzb21lIGNvbWJvIGRhdGEgYWZ0ZXIgaXQgaGFzIGJlZW4gcmVuZGVyZWRcbiAgICAgICAgICogQHBhcmFtIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgY2ZnLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIG5hbWUgZm9yIHRoZSBpbnB1dCBmaWVsZCBzbyBpdCBjYW4gYmUgZmV0Y2hlZCBpbiB0aGUgZm9ybVxuICAgICAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXROYW1lID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgICAgICBjZmcubmFtZSA9IG5hbWU7XG4gICAgICAgICAgICBpZihuYW1lKXtcbiAgICAgICAgICAgICAgICBjZmcubmFtZSArPSBuYW1lLmluZGV4T2YoJ1tdJykgPiAwID8gJycgOiAnW10nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYobXMuX3ZhbHVlQ29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICAkLmVhY2gobXMuX3ZhbHVlQ29udGFpbmVyLmNoaWxkcmVuKCksIGZ1bmN0aW9uKGksIGVsKXtcbiAgICAgICAgICAgICAgICAgICAgZWwubmFtZSA9IGNmZy5uYW1lO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aXRoIHRoZSBKU09OIGl0ZW1zIHByb3ZpZGVkXG4gICAgICAgICAqIEBwYXJhbSBpdGVtc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRTZWxlY3Rpb24gPSBmdW5jdGlvbihpdGVtcyl7XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyBhIHZhbHVlIGZvciB0aGUgY29tYm8gYm94LiBWYWx1ZSBtdXN0IGJlIGFuIGFycmF5IG9mIHZhbHVlcyB3aXRoIGRhdGEgdHlwZSBtYXRjaGluZyB2YWx1ZUZpZWxkIG9uZS5cbiAgICAgICAgICogQHBhcmFtIGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZXMpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICAgICAgICAkLmVhY2godmFsdWVzLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXJzdCB0cnkgdG8gc2VlIGlmIHdlIGhhdmUgdGhlIGZ1bGwgb2JqZWN0cyBmcm9tIG91ciBkYXRhIHNldFxuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICQuZWFjaChfY2JEYXRhLCBmdW5jdGlvbihpLGl0ZW0pe1xuICAgICAgICAgICAgICAgICAgICBpZihpdGVtW2NmZy52YWx1ZUZpZWxkXSA9PSB2YWx1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYoIWZvdW5kKXtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKHZhbHVlKSA9PT0gJ29iamVjdCcpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIganNvbiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbltjZmcudmFsdWVGaWVsZF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bY2ZnLmRpc3BsYXlGaWVsZF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goanNvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmKGl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyBkYXRhIHBhcmFtcyBmb3Igc3Vic2VxdWVudCBhamF4IHJlcXVlc3RzXG4gICAgICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2V0RGF0YVVybFBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcylcbiAgICAgICAge1xuICAgICAgICAgICAgY2ZnLmRhdGFVcmxQYXJhbXMgPSAkLmV4dGVuZCh7fSxwYXJhbXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKioqKioqKioqICBQUklWQVRFICoqKioqKioqKioqKi9cbiAgICAgICAgdmFyIF9zZWxlY3Rpb24gPSBbXSwgICAgICAvLyBzZWxlY3RlZCBvYmplY3RzXG4gICAgICAgICAgICBfY29tYm9JdGVtSGVpZ2h0ID0gMCwgLy8gaGVpZ2h0IGZvciBlYWNoIGNvbWJvIGl0ZW0uXG4gICAgICAgICAgICBfdGltZXIsXG4gICAgICAgICAgICBfaGFzRm9jdXMgPSBmYWxzZSxcbiAgICAgICAgICAgIF9ncm91cHMgPSBudWxsLFxuICAgICAgICAgICAgX2NiRGF0YSA9IFtdLFxuICAgICAgICAgICAgX2N0cmxEb3duID0gZmFsc2UsXG4gICAgICAgICAgICBLRVlDT0RFUyA9IHtcbiAgICAgICAgICAgICAgICBCQUNLU1BBQ0U6IDgsXG4gICAgICAgICAgICAgICAgVEFCOiA5LFxuICAgICAgICAgICAgICAgIEVOVEVSOiAxMyxcbiAgICAgICAgICAgICAgICBDVFJMOiAxNyxcbiAgICAgICAgICAgICAgICBFU0M6IDI3LFxuICAgICAgICAgICAgICAgIFNQQUNFOiAzMixcbiAgICAgICAgICAgICAgICBVUEFSUk9XOiAzOCxcbiAgICAgICAgICAgICAgICBET1dOQVJST1c6IDQwLFxuICAgICAgICAgICAgICAgIENPTU1BOiAxODhcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNlbGYgPSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW1wdGllcyB0aGUgcmVzdWx0IGNvbnRhaW5lciBhbmQgcmVmaWxscyBpdCB3aXRoIHRoZSBhcnJheSBvZiBqc29uIHJlc3VsdHMgaW4gaW5wdXRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9kaXNwbGF5U3VnZ2VzdGlvbnM6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zaG93KCk7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guZW1wdHkoKTtcblxuICAgICAgICAgICAgICAgIHZhciByZXNIZWlnaHQgPSAwLCAvLyB0b3RhbCBoZWlnaHQgdGFrZW4gYnkgZGlzcGxheWVkIHJlc3VsdHMuXG4gICAgICAgICAgICAgICAgICAgIG5iR3JvdXBzID0gMDtcblxuICAgICAgICAgICAgICAgIGlmKF9ncm91cHMgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzSGVpZ2h0ID0gX2NvbWJvSXRlbUhlaWdodCAqIGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBncnBOYW1lIGluIF9ncm91cHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5iR3JvdXBzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1ncm91cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogZ3JwTmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuYXBwZW5kVG8obXMuY29tYm9ib3gpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhfZ3JvdXBzW2dycE5hbWVdLml0ZW1zLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgX2dyb3VwSXRlbUhlaWdodCA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtZ3JvdXAnKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgICAgICAgICBpZihfZ3JvdXBJdGVtSGVpZ2h0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdmFyIHRtcFJlc0hlaWdodCA9IG5iR3JvdXBzICogX2dyb3VwSXRlbUhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSAoX2NvbWJvSXRlbUhlaWdodCAqIGRhdGEubGVuZ3RoKSArIHRtcFJlc0hlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSBfY29tYm9JdGVtSGVpZ2h0ICogKGRhdGEubGVuZ3RoICsgbmJHcm91cHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYocmVzSGVpZ2h0IDwgbXMuY29tYm9ib3guaGVpZ2h0KCkgfHwgcmVzSGVpZ2h0IDw9IGNmZy5tYXhEcm9wSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhlaWdodChyZXNIZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmKHJlc0hlaWdodCA+PSBtcy5jb21ib2JveC5oZWlnaHQoKSAmJiByZXNIZWlnaHQgPiBjZmcubWF4RHJvcEhlaWdodCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAxICYmIGNmZy5hdXRvU2VsZWN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKCc6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6bGFzdCcpLmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY2ZnLnNlbGVjdEZpcnN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKCc6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKS5hZGRDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDAgJiYgbXMuZ2V0UmF3VmFsdWUoKSAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbm9TdWdnZXN0aW9uVGV4dCA9IGNmZy5ub1N1Z2dlc3Rpb25UZXh0LnJlcGxhY2UoL1xce1xcey4qXFx9XFx9LywgbXMuaW5wdXQudmFsKCkpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIobm9TdWdnZXN0aW9uVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gV2hlbiBmcmVlIGVudHJ5IGlzIG9mZiwgYWRkIGludmFsaWQgY2xhc3MgdG8gaW5wdXQgaWYgbm8gZGF0YSBtYXRjaGVzXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICQobXMuaW5wdXQpLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcbiAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKG1zLmlucHV0KS5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGFuIGFycmF5IG9mIGpzb24gb2JqZWN0cyBmcm9tIGFuIGFycmF5IG9mIHN0cmluZ3MuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBqc29uID0gW107XG4gICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCBzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbnRyeSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBlbnRyeVtjZmcuZGlzcGxheUZpZWxkXSA9IGVudHJ5W2NmZy52YWx1ZUZpZWxkXSA9ICQudHJpbShzKTtcbiAgICAgICAgICAgICAgICAgICAganNvbi5wdXNoKGVudHJ5KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4ganNvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVwbGFjZXMgaHRtbCB3aXRoIGhpZ2hsaWdodGVkIGh0bWwgYWNjb3JkaW5nIHRvIGNhc2VcbiAgICAgICAgICAgICAqIEBwYXJhbSBodG1sXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfaGlnaGxpZ2h0U3VnZ2VzdGlvbjogZnVuY3Rpb24oaHRtbCkge1xuICAgICAgICAgICAgICAgIHZhciBxID0gbXMuaW5wdXQudmFsKCk7XG5cbiAgICAgICAgICAgICAgICAvL2VzY2FwZSBzcGVjaWFsIHJlZ2V4IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICB2YXIgc3BlY2lhbENoYXJhY3RlcnMgPSBbJ14nLCAnJCcsICcqJywgJysnLCAnPycsICcuJywgJygnLCAnKScsICc6JywgJyEnLCAnfCcsICd7JywgJ30nLCAnWycsICddJ107XG5cbiAgICAgICAgICAgICAgICAkLmVhY2goc3BlY2lhbENoYXJhY3RlcnMsIGZ1bmN0aW9uIChpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcSA9IHEucmVwbGFjZSh2YWx1ZSwgXCJcXFxcXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIGlmKHEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBodG1sOyAvLyBub3RoaW5nIGVudGVyZWQgYXMgaW5wdXRcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgZ2xvYiA9IGNmZy5tYXRjaENhc2UgPT09IHRydWUgPyAnZycgOiAnZ2knO1xuICAgICAgICAgICAgICAgIHJldHVybiBodG1sLnJlcGxhY2UobmV3IFJlZ0V4cCgnKCcgKyBxICsgJykoPyEoW148XSspPz4pJywgZ2xvYiksICc8ZW0+JDE8L2VtPicpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBNb3ZlcyB0aGUgc2VsZWN0ZWQgY3Vyc29yIGFtb25nc3QgdGhlIGxpc3QgaXRlbVxuICAgICAgICAgICAgICogQHBhcmFtIGRpciAtICd1cCcgb3IgJ2Rvd24nXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfbW92ZVNlbGVjdGVkUm93OiBmdW5jdGlvbihkaXIpIHtcbiAgICAgICAgICAgICAgICBpZighY2ZnLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbGlzdCwgc3RhcnQsIGFjdGl2ZSwgc2Nyb2xsUG9zO1xuICAgICAgICAgICAgICAgIGxpc3QgPSBtcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpO1xuICAgICAgICAgICAgICAgIGlmKGRpciA9PT0gJ2Rvd24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5lcSgwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5maWx0ZXIoJzpsYXN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFjdGl2ZSA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKTtcbiAgICAgICAgICAgICAgICBpZihhY3RpdmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZihkaXIgPT09ICdkb3duJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBhY3RpdmUubmV4dEFsbCgnLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpJykuZmlyc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5lcSgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFBvcyA9IG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnRbMF0ub2Zmc2V0VG9wICsgc3RhcnQub3V0ZXJIZWlnaHQoKSA+IG1zLmNvbWJvYm94LmhlaWdodCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKHNjcm9sbFBvcyArIF9jb21ib0l0ZW1IZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBhY3RpdmUucHJldkFsbCgnLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpJykuZmlyc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5maWx0ZXIoJzpsYXN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKF9jb21ib0l0ZW1IZWlnaHQgKiBsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydFswXS5vZmZzZXRUb3AgPCBtcy5jb21ib2JveC5zY3JvbGxUb3AoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcChtcy5jb21ib2JveC5zY3JvbGxUb3AoKSAtIF9jb21ib0l0ZW1IZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxpc3QucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7XG4gICAgICAgICAgICAgICAgc3RhcnQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFjY29yZGluZyB0byBnaXZlbiBkYXRhIGFuZCBxdWVyeSwgc29ydCBhbmQgYWRkIHN1Z2dlc3Rpb25zIGluIHRoZWlyIGNvbnRhaW5lclxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3Byb2Nlc3NTdWdnZXN0aW9uczogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSBudWxsLCBkYXRhID0gc291cmNlIHx8IGNmZy5kYXRhO1xuICAgICAgICAgICAgICAgIGlmKGRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEpID09PSAnZnVuY3Rpb24nKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhLmNhbGwobXMsIG1zLmdldFJhd1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihkYXRhKSA9PT0gJ3N0cmluZycpIHsgLy8gZ2V0IHJlc3VsdHMgZnJvbSBhamF4XG4gICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdiZWZvcmVsb2FkJywgW21zXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlQYXJhbXNbY2ZnLnF1ZXJ5UGFyYW1dID0gbXMuaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gJC5leHRlbmQocXVlcnlQYXJhbXMsIGNmZy5kYXRhVXJsUGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQuYWpheCgkLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY2ZnLm1ldGhvZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGRhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGNmZy5iZWZvcmVTZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGFzeW5jRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb24gPSB0eXBlb2YoYXN5bmNEYXRhKSA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKGFzeW5jRGF0YSkgOiBhc3luY0RhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucyhqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignbG9hZCcsIFttcywganNvbl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLl9hc3luY1ZhbHVlcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZXRWYWx1ZSh0eXBlb2Yoc2VsZi5fYXN5bmNWYWx1ZXMpID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2Uoc2VsZi5fYXN5bmNWYWx1ZXMpIDogc2VsZi5fYXN5bmNWYWx1ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUoc2VsZi5fYXN5bmNWYWx1ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3coXCJDb3VsZCBub3QgcmVhY2ggc2VydmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGNmZy5hamF4Q29uZmlnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJlc3VsdHMgZnJvbSBsb2NhbCBhcnJheVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPiAwICYmIHR5cGVvZihkYXRhWzBdKSA9PT0gJ3N0cmluZycpIHsgLy8gcmVzdWx0cyBmcm9tIGFycmF5IG9mIHN0cmluZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2JEYXRhID0gc2VsZi5fZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIHJlZ3VsYXIganNvbiBhcnJheSBvciBqc29uIG9iamVjdCB3aXRoIHJlc3VsdHMgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2JEYXRhID0gZGF0YVtjZmcucmVzdWx0c0ZpZWxkXSB8fCBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBzb3J0ZWREYXRhID0gY2ZnLm1vZGUgPT09ICdyZW1vdGUnID8gX2NiRGF0YSA6IHNlbGYuX3NvcnRBbmRUcmltKF9jYkRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9kaXNwbGF5U3VnZ2VzdGlvbnMoc2VsZi5fZ3JvdXAoc29ydGVkRGF0YSkpO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW5kZXIgdGhlIGNvbXBvbmVudCB0byB0aGUgZ2l2ZW4gaW5wdXQgRE9NIGVsZW1lbnRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9yZW5kZXI6IGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgICAgICAgICAgbXMuc2V0TmFtZShjZmcubmFtZSk7ICAvLyBtYWtlIHN1cmUgdGhlIGZvcm0gbmFtZSBpcyBjb3JyZWN0XG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIG1haW4gZGl2LCB3aWxsIHJlbGF5IHRoZSBmb2N1cyBldmVudHMgdG8gdGhlIGNvbnRhaW5lZCBpbnB1dCBlbGVtZW50LlxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWN0biBmb3JtLWNvbnRyb2wgJyArIChjZmcucmVzdWx0QXNTdHJpbmcgPyAnbXMtYXMtc3RyaW5nICcgOiAnJykgKyBjZmcuY2xzICtcbiAgICAgICAgICAgICAgICAgICAgICAgICgkKGVsKS5oYXNDbGFzcygnaW5wdXQtbGcnKSA/ICcgaW5wdXQtbGcnIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICgkKGVsKS5oYXNDbGFzcygnaW5wdXQtc20nKSA/ICcgaW5wdXQtc20nIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuZGlzYWJsZWQgPT09IHRydWUgPyAnIG1zLWN0bi1kaXNhYmxlZCcgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5lZGl0YWJsZSA9PT0gdHJ1ZSA/ICcnIDogJyBtcy1jdG4tcmVhZG9ubHknKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmhpZGVUcmlnZ2VyID09PSBmYWxzZSA/ICcnIDogJyBtcy1uby10cmlnZ2VyJyksXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiBjZmcuc3R5bGUsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBjZmcuaWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5ibHVyKCQucHJveHkoaGFuZGxlcnMuX29uQmx1ciwgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5rZXlkb3duKCQucHJveHkoaGFuZGxlcnMuX29uS2V5RG93biwgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5rZXl1cCgkLnByb3h5KGhhbmRsZXJzLl9vbktleVVwLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgaW5wdXQgZmllbGRcbiAgICAgICAgICAgICAgICBtcy5pbnB1dCA9ICQoJzxpbnB1dC8+JywgJC5leHRlbmQoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6IGNmZy5lZGl0YWJsZSA9PT0gdHJ1ZSA/ICcnIDogJyBtcy1pbnB1dC1yZWFkb25seScsXG4gICAgICAgICAgICAgICAgICAgIHJlYWRvbmx5OiAhY2ZnLmVkaXRhYmxlLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogY2ZnLnBsYWNlaG9sZGVyLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY2ZnLmRpc2FibGVkXG4gICAgICAgICAgICAgICAgfSwgY2ZnLmlucHV0Q2ZnKSk7XG5cbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Rm9jdXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Q2xpY2ssIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBzdWdnZXN0aW9ucy4gd2lsbCBhbHdheXMgYmUgcGxhY2VkIG9uIGZvY3VzXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3ggPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtY3RuIGRyb3Bkb3duLW1lbnUnXG4gICAgICAgICAgICAgICAgfSkuaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgIC8vIGJpbmQgdGhlIG9uY2xpY2sgYW5kIG1vdXNlb3ZlciB1c2luZyBkZWxlZ2F0ZWQgZXZlbnRzIChuZWVkcyBqUXVlcnkgPj0gMS43KVxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94Lm9uKCdjbGljaycsICdkaXYubXMtcmVzLWl0ZW0nLCAkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbVNlbGVjdGVkLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3gub24oJ21vdXNlb3ZlcicsICdkaXYubXMtcmVzLWl0ZW0nLCAkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbU1vdXNlT3ZlciwgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7XG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lciA9IGNmZy5zZWxlY3Rpb25Db250YWluZXI7XG4gICAgICAgICAgICAgICAgICAgICQobXMuc2VsZWN0aW9uQ29udGFpbmVyKS5hZGRDbGFzcygnbXMtc2VsLWN0bicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtY3RuJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiAhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuYXBwZW5kKG1zLmlucHV0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1zLmhlbHBlciA9ICQoJzxzcGFuLz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1oZWxwZXIgJyArIGNmZy5pbmZvTXNnQ2xzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKCk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5oZWxwZXIpO1xuXG5cbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHdob2xlIHRoaW5nXG4gICAgICAgICAgICAgICAgJChlbCkucmVwbGFjZVdpdGgobXMuY29udGFpbmVyKTtcblxuICAgICAgICAgICAgICAgIGlmKCFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm90dG9tJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uU3RhY2tlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIud2lkdGgobXMuY29udGFpbmVyLndpZHRoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuYWRkQ2xhc3MoJ21zLXN0YWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyaWdodCc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmNzcygnZmxvYXQnLCAnbGVmdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSB0cmlnZ2VyIG9uIHRoZSByaWdodCBzaWRlXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmhpZGVUcmlnZ2VyID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy50cmlnZ2VyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXRyaWdnZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogJzxkaXYgY2xhc3M9XCJtcy10cmlnZ2VyLWljb1wiPjwvZGl2PidcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG1zLnRyaWdnZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25UcmlnZ2VyQ2xpY2ssIHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy50cmlnZ2VyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkKHdpbmRvdykucmVzaXplKCQucHJveHkoaGFuZGxlcnMuX29uV2luZG93UmVzaXplZCwgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgLy8gZG8gbm90IHBlcmZvcm0gYW4gaW5pdGlhbCBjYWxsIGlmIHdlIGFyZSB1c2luZyBhamF4IHVubGVzcyB3ZSBoYXZlIGluaXRpYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnZhbHVlICE9PSBudWxsIHx8IGNmZy5kYXRhICE9PSBudWxsKXtcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGNmZy5kYXRhKSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fYXN5bmNWYWx1ZXMgPSBjZmcudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnZhbHVlICE9PSBudWxsKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZXRWYWx1ZShjZmcudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkKFwiYm9keVwiKS5jbGljayhmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKG1zLmNvbnRhaW5lci5oYXNDbGFzcygnbXMtY3RuLWZvY3VzJykgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5oYXMoZS50YXJnZXQpLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoJ21zLXJlcy1pdGVtJykgPCAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbXMtY2xvc2UtYnRuJykgPCAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXJbMF0gIT09IGUudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5fb25CbHVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW5kZXJzIGVhY2ggZWxlbWVudCB3aXRoaW4gdGhlIGNvbWJvIGJveFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3JlbmRlckNvbWJvSXRlbXM6IGZ1bmN0aW9uKGl0ZW1zLCBpc0dyb3VwZWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVmID0gdGhpcywgaHRtbCA9ICcnO1xuICAgICAgICAgICAgICAgICQuZWFjaChpdGVtcywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNwbGF5ZWQgPSBjZmcucmVuZGVyZXIgIT09IG51bGwgPyBjZmcucmVuZGVyZXIuY2FsbChyZWYsIHZhbHVlKSA6IHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGlzYWJsZWQgPSBjZmcuZGlzYWJsZWRGaWVsZCAhPT0gbnVsbCAmJiB2YWx1ZVtjZmcuZGlzYWJsZWRGaWVsZF0gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWl0ZW0gJyArIChpc0dyb3VwZWQgPyAnbXMtcmVzLWl0ZW0tZ3JvdXBlZCAnOicnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRpc2FibGVkID8gJ21zLXJlcy1pdGVtLWRpc2FibGVkICc6JycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoaW5kZXggJSAyID09PSAxICYmIGNmZy51c2VaZWJyYVN0eWxlID09PSB0cnVlID8gJ21zLXJlcy1vZGQnIDogJycpLFxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogY2ZnLmhpZ2hsaWdodCA9PT0gdHJ1ZSA/IHNlbGYuX2hpZ2hsaWdodFN1Z2dlc3Rpb24oZGlzcGxheWVkKSA6IGRpc3BsYXllZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLWpzb24nOiBKU09OLnN0cmluZ2lmeSh2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJCgnPGRpdi8+JykuYXBwZW5kKHJlc3VsdEl0ZW1FbCkuaHRtbCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmFwcGVuZChodG1sKTtcbiAgICAgICAgICAgICAgICBfY29tYm9JdGVtSGVpZ2h0ID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtOmZpcnN0Jykub3V0ZXJIZWlnaHQoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmVuZGVycyB0aGUgc2VsZWN0ZWQgaXRlbXMgaW50byB0aGVpciBjb250YWluZXIuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcmVuZGVyU2VsZWN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVmID0gdGhpcywgdyA9IDAsIGlucHV0T2Zmc2V0ID0gMCwgaXRlbXMgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgYXNUZXh0ID0gY2ZnLnJlc3VsdEFzU3RyaW5nID09PSB0cnVlICYmICFfaGFzRm9jdXM7XG5cbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuZmluZCgnLm1zLXNlbC1pdGVtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgaWYobXMuX3ZhbHVlQ29udGFpbmVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQuZWFjaChfc2VsZWN0aW9uLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpe1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZEl0ZW1FbCwgZGVsSXRlbUVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtSHRtbCA9IGNmZy5zZWxlY3Rpb25SZW5kZXJlciAhPT0gbnVsbCA/IGNmZy5zZWxlY3Rpb25SZW5kZXJlci5jYWxsKHJlZiwgdmFsdWUpIDogdmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbGlkQ2xzID0gc2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdKSA/ICcnIDogJyBtcy1zZWwtaW52YWxpZCc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdGFnIHJlcHJlc2VudGluZyBzZWxlY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBpZihhc1RleHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbUVsID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtaXRlbSBtcy1zZWwtdGV4dCAnICsgY2ZnLnNlbGVjdGlvbkNscyArIHZhbGlkQ2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IHNlbGVjdGVkSXRlbUh0bWwgKyAoaW5kZXggPT09IChfc2VsZWN0aW9uLmxlbmd0aCAtIDEpID8gJycgOiBjZmcucmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1pdGVtICcgKyBjZmcuc2VsZWN0aW9uQ2xzICsgdmFsaWRDbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogc2VsZWN0ZWRJdGVtSHRtbFxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZGF0YSgnanNvbicsIHZhbHVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmRpc2FibGVkID09PSBmYWxzZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc21hbGwgY3Jvc3MgaW1nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsSXRlbUVsID0gJCgnPHNwYW4vPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWNsb3NlLWJ0bidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpLmFwcGVuZFRvKHNlbGVjdGVkSXRlbUVsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbEl0ZW1FbC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRhZ1RyaWdnZXJDbGljaywgcmVmKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHNlbGVjdGVkSXRlbUVsKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIucHJlcGVuZChpdGVtcyk7XG5cbiAgICAgICAgICAgICAgICAvLyBzdG9yZSB0aGUgdmFsdWVzLCBiZWhhdmlvdXIgb2YgbXVsdGlwbGUgc2VsZWN0XG4gICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICBzdHlsZTogJ2Rpc3BsYXk6IG5vbmU7J1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICQuZWFjaChtcy5nZXRWYWx1ZSgpLCBmdW5jdGlvbihpLCB2YWwpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWwgPSAkKCc8aW5wdXQvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdoaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY2ZnLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRUbyhtcy5fdmFsdWVDb250YWluZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLl92YWx1ZUNvbnRhaW5lci5hcHBlbmRUbyhtcy5zZWxlY3Rpb25Db250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmICFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LndpZHRoKDApO1xuICAgICAgICAgICAgICAgICAgICBpbnB1dE9mZnNldCA9IG1zLmlucHV0Lm9mZnNldCgpLmxlZnQgLSBtcy5zZWxlY3Rpb25Db250YWluZXIub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgICAgICAgICAgdyA9IG1zLmNvbnRhaW5lci53aWR0aCgpIC0gaW5wdXRPZmZzZXQgLSA0MjtcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQud2lkdGgodyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2VsZWN0IGFuIGl0ZW0gZWl0aGVyIHRocm91Z2gga2V5Ym9hcmQgb3IgbW91c2VcbiAgICAgICAgICAgICAqIEBwYXJhbSBpdGVtXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfc2VsZWN0SXRlbTogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIGlmKGNmZy5tYXhTZWxlY3Rpb24gPT09IDEpe1xuICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKGl0ZW0uZGF0YSgnanNvbicpKTtcbiAgICAgICAgICAgICAgICBpdGVtLnJlbW92ZUNsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyA9PT0gZmFsc2UgfHwgX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZighX2hhc0ZvY3VzKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoX2hhc0ZvY3VzICYmIChjZmcuZXhwYW5kT25Gb2N1cyB8fCBfY3RybERvd24pKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKF9jdHJsRG93bil7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU29ydHMgdGhlIHJlc3VsdHMgYW5kIGN1dCB0aGVtIGRvd24gdG8gbWF4ICMgb2YgZGlzcGxheWVkIHJlc3VsdHMgYXQgb25jZVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3NvcnRBbmRUcmltOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHEgPSBtcy5nZXRSYXdWYWx1ZSgpLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZFZhbHVlcyA9IG1zLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgLy8gZmlsdGVyIHRoZSBkYXRhIGFjY29yZGluZyB0byBnaXZlbiBpbnB1dFxuICAgICAgICAgICAgICAgIGlmKHEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIG9iaikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBvYmpbY2ZnLmRpc3BsYXlGaWVsZF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZigoY2ZnLm1hdGNoQ2FzZSA9PT0gdHJ1ZSAmJiBuYW1lLmluZGV4T2YocSkgPiAtMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLm1hdGNoQ2FzZSA9PT0gZmFsc2UgJiYgbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKSA+IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5zdHJpY3RTdWdnZXN0ID09PSBmYWxzZSB8fCBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkLnB1c2gob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQgPSBkYXRhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0YWtlIG91dCB0aGUgb25lcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgJC5lYWNoKGZpbHRlcmVkLCBmdW5jdGlvbihpbmRleCwgb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYWxsb3dEdXBsaWNhdGVzIHx8ICQuaW5BcnJheShvYmpbY2ZnLnZhbHVlRmllbGRdLCBzZWxlY3RlZFZhbHVlcykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucy5wdXNoKG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBzb3J0IHRoZSBkYXRhXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNvcnRPcmRlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucy5zb3J0KGZ1bmN0aW9uKGEsYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYVtjZmcuc29ydE9yZGVyXSA8IGJbY2ZnLnNvcnRPcmRlcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnNvcnREaXIgPT09ICdhc2MnID8gLTEgOiAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYVtjZmcuc29ydE9yZGVyXSA+IGJbY2ZnLnNvcnRPcmRlcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnNvcnREaXIgPT09ICdhc2MnID8gMSA6IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyB0cmltIGl0IGRvd25cbiAgICAgICAgICAgICAgICBpZihjZmcubWF4U3VnZ2VzdGlvbnMgJiYgY2ZnLm1heFN1Z2dlc3Rpb25zID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucyA9IG5ld1N1Z2dlc3Rpb25zLnNsaWNlKDAsIGNmZy5tYXhTdWdnZXN0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXdTdWdnZXN0aW9ucztcblxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2dyb3VwOiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAvLyBidWlsZCBncm91cHNcbiAgICAgICAgICAgICAgICBpZihjZmcuZ3JvdXBCeSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BzID0gY2ZnLmdyb3VwQnkuaW5kZXhPZignLicpID4gLTEgPyBjZmcuZ3JvdXBCeS5zcGxpdCgnLicpIDogY2ZnLmdyb3VwQnk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcCA9IHZhbHVlW2NmZy5ncm91cEJ5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihwcm9wcykgIT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZShwcm9wcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHByb3BbcHJvcHMuc2hpZnQoKV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX2dyb3Vwc1twcm9wXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2dyb3Vwc1twcm9wXSA9IHt0aXRsZTogcHJvcCwgaXRlbXM6IFt2YWx1ZV19O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2dyb3Vwc1twcm9wXS5pdGVtcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBVcGRhdGUgdGhlIGhlbHBlciB0ZXh0XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfdXBkYXRlSGVscGVyOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgICAgICAgICAgbXMuaGVscGVyLmh0bWwoaHRtbCk7XG4gICAgICAgICAgICAgICAgaWYoIW1zLmhlbHBlci5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5mYWRlSW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZhbGlkYXRlIGFuIGl0ZW0gYWdhaW5zdCB2dHlwZSBvciB2cmVnZXhcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF92YWxpZGF0ZVNpbmdsZUl0ZW06IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgICAgICBpZihjZmcudnJlZ2V4ICE9PSBudWxsICYmIGNmZy52cmVnZXggaW5zdGFuY2VvZiBSZWdFeHApe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnZyZWdleC50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoY2ZnLnZ0eXBlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChjZmcudnR5cGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWxwaGEnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXlthLXpBLVpfXSskLykudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdhbHBoYW51bSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eW2EtekEtWjAtOV9dKyQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VtYWlsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL14oXFx3KykoW1xcLSsuXVtcXHddKykqQChcXHdbXFwtXFx3XSpcXC4pezEsNX0oW0EtWmEtel0pezIsNn0kLykudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvKCgoXmh0dHBzPyl8KF5mdHApKTpcXC9cXC8oW1xcLVxcd10rXFwuKStcXHd7MiwzfShcXC9bJVxcLVxcd10rKFxcLlxcd3syLH0pPykqKChbXFx3XFwtXFwuXFw/XFxcXFxcLytAJiM7YH49JSFdKikoXFwuXFx3ezIsfSk/KSpcXC8/KS9pKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2lwYWRkcmVzcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30kLykudGVzdCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGhhbmRsZXJzID0ge1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBibHVycmluZyBvdXQgb2YgdGhlIGNvbXBvbmVudFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uQmx1cjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdtcy1jdG4tZm9jdXMnKTtcbiAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgIF9oYXNGb2N1cyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmKG1zLmdldFJhd1ZhbHVlKCkgIT09ICcnICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBvYmpbY2ZnLmRpc3BsYXlGaWVsZF0gPSBvYmpbY2ZnLnZhbHVlRmllbGRdID0gbXMuZ2V0UmF3VmFsdWUoKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKG9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuXG4gICAgICAgICAgICAgICAgaWYobXMuaXNWYWxpZCgpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVsc2UgaWYobXMuaW5wdXQudmFsKCkgIT09ICcnICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBtcy5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoJycpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2JsdXInLCBbbXNdKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gaG92ZXJpbmcgYW4gZWxlbWVudCBpbiB0aGUgY29tYm9cbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25Db21ib0l0ZW1Nb3VzZU92ZXI6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgICAgIGlmKCF0YXJnZXQuaGFzQ2xhc3MoJ21zLXJlcy1pdGVtLWRpc2FibGVkJykpe1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGFuIGl0ZW0gaXMgY2hvc2VuIGZyb20gdGhlIGxpc3RcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25Db21ib0l0ZW1TZWxlY3RlZDogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICAgICAgaWYoIXRhcmdldC5oYXNDbGFzcygnbXMtcmVzLWl0ZW0tZGlzYWJsZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdEl0ZW0oJChlLmN1cnJlbnRUYXJnZXQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGZvY3VzaW5nIG9uIHRoZSBjb250YWluZXIgZGl2LiBXaWxsIGZvY3VzIG9uIHRoZSBpbnB1dCBmaWVsZCBpbnN0ZWFkLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uRm9jdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIG9uIHRoZSBpbnB1dCB0ZXh0IGZpZWxkXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25JbnB1dENsaWNrOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmIChtcy5pc0Rpc2FibGVkKCkgPT09IGZhbHNlICYmIF9oYXNGb2N1cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLnRvZ2dsZU9uQ2xpY2sgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZmcuZXhwYW5kZWQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBmb2N1c2luZyBvbiB0aGUgaW5wdXQgdGV4dCBmaWVsZC5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbklucHV0Rm9jdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgIV9oYXNGb2N1cykge1xuICAgICAgICAgICAgICAgICAgICBfaGFzRm9jdXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYWRkQ2xhc3MoJ21zLWN0bi1mb2N1cycpO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJMZW5ndGggPSBtcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZE9uRm9jdXMgPT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsIF9zZWxlY3Rpb24ubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjdXJMZW5ndGggPCBjZmcubWluQ2hhcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGN1ckxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2ZvY3VzJywgW21zXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiB0aGUgdXNlciBwcmVzc2VzIGEga2V5IHdoaWxlIHRoZSBjb21wb25lbnQgaGFzIGZvY3VzXG4gICAgICAgICAgICAgKiBUaGlzIGlzIHdoZXJlIHdlIHdhbnQgdG8gaGFuZGxlIGFsbCBrZXlzIHRoYXQgZG9uJ3QgcmVxdWlyZSB0aGUgdXNlciBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICogc2luY2UgaXQgaGFzbid0IHJlZ2lzdGVyZWQgdGhlIGtleSBoaXQgeWV0XG4gICAgICAgICAgICAgKiBAcGFyYW0gZSBrZXlFdmVudFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uS2V5RG93bjogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGhvdyB0YWIgc2hvdWxkIGJlIGhhbmRsZWRcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpLFxuICAgICAgICAgICAgICAgICAgICBmcmVlSW5wdXQgPSBtcy5pbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdrZXlkb3duJywgW21zLCBlXSk7XG5cbiAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLlRBQiAmJiAoY2ZnLnVzZVRhYktleSA9PT0gZmFsc2UgfHxcbiAgICAgICAgICAgICAgICAgICAgKGNmZy51c2VUYWJLZXkgPT09IHRydWUgJiYgYWN0aXZlLmxlbmd0aCA9PT0gMCAmJiBtcy5pbnB1dC52YWwoKS5sZW5ndGggPT09IDApKSkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5fb25CbHVyKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkJBQ0tTUEFDRTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dC5sZW5ndGggPT09IDAgJiYgbXMuZ2V0U2VsZWN0aW9uKCkubGVuZ3RoID4gMCAmJiBjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFttcywgbXMuZ2V0U2VsZWN0aW9uKCldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgbXMuZ2V0VmFsdWUoKS5sZW5ndGggPiAwKSA/ICcnIDogY2ZnLnBsYWNlaG9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlRBQjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FU0M6XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5FTlRFUjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dCAhPT0gJycgfHwgY2ZnLmV4cGFuZGVkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DT01NQTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy51c2VDb21tYUtleSA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQ1RSTDpcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jdHJsRG93biA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJkb3duXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVVBBUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX21vdmVTZWxlY3RlZFJvdyhcInVwXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYSBrZXkgaXMgcmVsZWFzZWQgd2hpbGUgdGhlIGNvbXBvbmVudCBoYXMgZm9jdXNcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25LZXlVcDogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHZhciBmcmVlSW5wdXQgPSBtcy5nZXRSYXdWYWx1ZSgpLFxuICAgICAgICAgICAgICAgICAgICBpbnB1dFZhbGlkID0gJC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAoIWNmZy5tYXhFbnRyeUxlbmd0aCB8fCAkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aCA8PSBjZmcubWF4RW50cnlMZW5ndGgpLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCxcbiAgICAgICAgICAgICAgICAgICAgb2JqID0ge307XG5cbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdrZXl1cCcsIFttcywgZV0pO1xuXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aW1lcik7XG5cbiAgICAgICAgICAgICAgICAvLyBjb2xsYXBzZSBpZiBlc2NhcGUsIGJ1dCBrZWVwIGZvY3VzLlxuICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuRVNDICYmIGNmZy5leHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlnbm9yZSBhIGJ1bmNoIG9mIGtleXNcbiAgICAgICAgICAgICAgICBpZigoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5UQUIgJiYgY2ZnLnVzZVRhYktleSA9PT0gZmFsc2UpIHx8IChlLmtleUNvZGUgPiBLRVlDT0RFUy5FTlRFUiAmJiBlLmtleUNvZGUgPCBLRVlDT0RFUy5TUEFDRSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5DVFJMKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jdHJsRG93biA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3dpdGNoKGUua2V5Q29kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlVQQVJST1c6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOlxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVOVEVSOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLlRBQjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DT01NQTpcbiAgICAgICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlICE9PSBLRVlDT0RFUy5DT01NQSB8fCBjZmcudXNlQ29tbWFLZXkgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSl7IC8vIGlmIGEgc2VsZWN0aW9uIGlzIHBlcmZvcm1lZCwgc2VsZWN0IGl0IGFuZCByZXNldCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGVjdGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0SXRlbShzZWxlY3RlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBubyBzZWxlY3Rpb24gb3IgaWYgZnJlZXRleHQgZW50ZXJlZCBhbmQgZnJlZSBlbnRyaWVzIGFsbG93ZWQsIGFkZCBuZXcgb2JqIHRvIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaW5wdXRWYWxpZCA9PT0gdHJ1ZSAmJiBjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtjZmcuZGlzcGxheUZpZWxkXSA9IG9ialtjZmcudmFsdWVGaWVsZF0gPSBmcmVlSW5wdXQudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTsgLy8gcmVzZXQgY29tYm8gc3VnZ2VzdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dC5sZW5ndGggPCBjZmcubWluQ2hhcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gZnJlZUlucHV0Lmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZihjZmcubWF4RW50cnlMZW5ndGggJiYgZnJlZUlucHV0Lmxlbmd0aCA+IGNmZy5tYXhFbnRyeUxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heEVudHJ5UmVuZGVyZXIuY2FsbCh0aGlzLCBmcmVlSW5wdXQubGVuZ3RoIC0gY2ZnLm1heEVudHJ5TGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLm1pbkNoYXJzIDw9IGZyZWVJbnB1dC5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgY2ZnLnR5cGVEZWxheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIHVwb24gY3Jvc3MgZm9yIGRlbGV0aW9uXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uVGFnVHJpZ2dlckNsaWNrOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgbXMucmVtb3ZlRnJvbVNlbGVjdGlvbigkKGUuY3VycmVudFRhcmdldCkuZGF0YSgnanNvbicpKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgb24gdGhlIHNtYWxsIHRyaWdnZXIgaW4gdGhlIHJpZ2h0XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25UcmlnZ2VyQ2xpY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgIShjZmcuZXhwYW5kT25Gb2N1cyA9PT0gdHJ1ZSAmJiBfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcigndHJpZ2dlcmNsaWNrJywgW21zXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjdXJMZW5ndGggPSBtcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGN1ckxlbmd0aCA+PSBjZmcubWluQ2hhcnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGN1ckxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiB0aGUgYnJvd3NlciB3aW5kb3cgaXMgcmVzaXplZFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uV2luZG93UmVzaXplZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc3RhcnR1cCBwb2ludFxuICAgICAgICBpZihlbGVtZW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZWxmLl9yZW5kZXIoZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJC5mbi5tYWdpY1N1Z2dlc3QgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBvYmogPSAkKHRoaXMpO1xuXG4gICAgICAgIGlmKG9iai5zaXplKCkgPT09IDEgJiYgb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgb2JqLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgLy8gYXNzdW1lICQodGhpcykgaXMgYW4gZWxlbWVudFxuICAgICAgICAgICAgdmFyIGNudHIgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gZWFybHkgaWYgdGhpcyBlbGVtZW50IGFscmVhZHkgaGFzIGEgcGx1Z2luIGluc3RhbmNlXG4gICAgICAgICAgICBpZihjbnRyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcpKXtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHRoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3NlbGVjdCcpeyAvLyByZW5kZXJpbmcgZnJvbSBzZWxlY3RcbiAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICBvcHRpb25zLnZhbHVlID0gW107XG4gICAgICAgICAgICAgICAgJC5lYWNoKHRoaXMuY2hpbGRyZW4sIGZ1bmN0aW9uKGluZGV4LCBjaGlsZCl7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNoaWxkLm5vZGVOYW1lICYmIGNoaWxkLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdvcHRpb24nKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YS5wdXNoKHtpZDogY2hpbGQudmFsdWUsIG5hbWU6IGNoaWxkLnRleHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCQoY2hpbGQpLmF0dHIoJ3NlbGVjdGVkJykpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMudmFsdWUucHVzaChjaGlsZC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRlZiA9IHt9O1xuICAgICAgICAgICAgLy8gc2V0IHZhbHVlcyBmcm9tIERPTSBjb250YWluZXIgZWxlbWVudFxuICAgICAgICAgICAgJC5lYWNoKHRoaXMuYXR0cmlidXRlcywgZnVuY3Rpb24oaSwgYXR0KXtcbiAgICAgICAgICAgICAgICBkZWZbYXR0Lm5hbWVdID0gYXR0Lm5hbWUgPT09ICd2YWx1ZScgJiYgYXR0LnZhbHVlICE9PSAnJyA/IEpTT04ucGFyc2UoYXR0LnZhbHVlKSA6IGF0dC52YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZmllbGQgPSBuZXcgTWFnaWNTdWdnZXN0KHRoaXMsICQuZXh0ZW5kKFtdLCAkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cywgb3B0aW9ucywgZGVmKSk7XG4gICAgICAgICAgICBjbnRyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcsIGZpZWxkKTtcbiAgICAgICAgICAgIGZpZWxkLmNvbnRhaW5lci5kYXRhKCdtYWdpY1N1Z2dlc3QnLCBmaWVsZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKG9iai5zaXplKCkgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuXG4gICAkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cyA9IHt9O1xufSkoalF1ZXJ5KTtcbiJdfQ==
