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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImdpZmZmZXIuanMiLCJsb2FkLmpzIiwibWFzb25yeS5wa2dkLm1pbi5qcyIsInN0YXJfY29kZS5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LW1pbi5qcyIsInNpdGUvbmljb2xhc2JpemUtbWFnaWNzdWdnZXN0LTIzMGIwOGIvbWFnaWNzdWdnZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQUEsTUFBTSxDQUFDLFFBQVAsR0FBa0IsU0FBQyxNQUFELEVBQVMsR0FBVCxFQUFjLE1BQWQsRUFBc0IsSUFBdEIsRUFBNEIsUUFBNUI7QUFDaEIsUUFBQTtJQUFBLFFBQUEsR0FBVyxRQUFBLElBQVksSUFBWixJQUFvQjtJQUMvQixJQUFBLEdBQU8sSUFBQSxJQUFRO0lBQ2YsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFvQixDQUF2QjtNQUNFLElBQUEsR0FBTyxPQURUOztJQUVBLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBcUIsQ0FBeEI7TUFDRSxNQUFBLEdBQVM7TUFDVCxJQUFBLEdBQU8sT0FGVDs7SUFHQSxNQUFBLEdBQVMsTUFBQSxJQUFVO0FBQ25CLFNBQUEsV0FBQTs7TUFDRSxJQUF3QixTQUF4QjtRQUFBLE9BQU8sTUFBTyxDQUFBLENBQUEsRUFBZDs7QUFERjtJQUVBLFNBQUEsR0FBZSxHQUFHLENBQUMsTUFBSixDQUFXLEtBQVgsQ0FBQSxJQUFxQixDQUF4QixHQUErQixHQUEvQixHQUF3QztXQUNwRCxDQUFDLENBQUMsSUFBRixDQUNFO01BQUEs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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjcmlwdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy5hcGlfY2FsbCA9IChtZXRob2QsIHVybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaykgLT5cbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBkYXRhIHx8IHBhcmFtc1xuICBkYXRhID0gZGF0YSB8fCBwYXJhbXNcbiAgaWYgYXJndW1lbnRzLmxlbmd0aCA9PSA0XG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09ICAzXG4gICAgcGFyYW1zID0gdW5kZWZpbmVkXG4gICAgZGF0YSA9IHVuZGVmaW5lZFxuICBwYXJhbXMgPSBwYXJhbXMgfHwge31cbiAgZm9yIGssIHYgb2YgcGFyYW1zXG4gICAgZGVsZXRlIHBhcmFtc1trXSBpZiBub3Qgdj9cbiAgc2VwYXJhdG9yID0gaWYgdXJsLnNlYXJjaCgnXFxcXD8nKSA+PSAwIHRoZW4gJyYnIGVsc2UgJz8nXG4gICQuYWpheFxuICAgIHR5cGU6IG1ldGhvZFxuICAgIHVybDogXCIje3VybH0je3NlcGFyYXRvcn0jeyQucGFyYW0gcGFyYW1zfVwiXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGFjY2VwdHM6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICBkYXRhOiBpZiBkYXRhIHRoZW4gSlNPTi5zdHJpbmdpZnkoZGF0YSkgZWxzZSB1bmRlZmluZWRcbiAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgIGlmIGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJ1xuICAgICAgICBtb3JlID0gdW5kZWZpbmVkXG4gICAgICAgIGlmIGRhdGEubmV4dF91cmxcbiAgICAgICAgICBtb3JlID0gKGNhbGxiYWNrKSAtPiBhcGlfY2FsbChtZXRob2QsIGRhdGEubmV4dF91cmwsIHt9LCBjYWxsYmFjaylcbiAgICAgICAgY2FsbGJhY2s/IHVuZGVmaW5lZCwgZGF0YS5yZXN1bHQsIG1vcmVcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2s/IGRhdGFcbiAgICBlcnJvcjogKGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93bikgLT5cbiAgICAgIGVycm9yID1cbiAgICAgICAgZXJyb3JfY29kZTogJ2FqYXhfZXJyb3InXG4gICAgICAgIHRleHRfc3RhdHVzOiB0ZXh0U3RhdHVzXG4gICAgICAgIGVycm9yX3Rocm93bjogZXJyb3JUaHJvd25cbiAgICAgICAganFYSFI6IGpxWEhSXG4gICAgICB0cnlcbiAgICAgICAgZXJyb3IgPSAkLnBhcnNlSlNPTihqcVhIUi5yZXNwb25zZVRleHQpIGlmIGpxWEhSLnJlc3BvbnNlVGV4dFxuICAgICAgY2F0Y2ggZVxuICAgICAgICBlcnJvciA9IGVycm9yXG4gICAgICBMT0cgJ2FwaV9jYWxsIGVycm9yJywgZXJyb3JcbiAgICAgIGNhbGxiYWNrPyBlcnJvclxuIiwiKC0+XG4gIGNsYXNzIHdpbmRvdy5GaWxlVXBsb2FkZXJcbiAgICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zKSAtPlxuICAgICAgQHVwbG9hZF9oYW5kbGVyID0gQG9wdGlvbnMudXBsb2FkX2hhbmRsZXJcbiAgICAgIEBzZWxlY3RvciA9IEBvcHRpb25zLnNlbGVjdG9yXG4gICAgICBAZHJvcF9hcmVhID0gQG9wdGlvbnMuZHJvcF9hcmVhXG4gICAgICBAdXBsb2FkX3VybCA9IEBvcHRpb25zLnVwbG9hZF91cmwgb3IgXCIvYXBpL3YxI3t3aW5kb3cubG9jYXRpb24ucGF0aG5hbWV9XCJcbiAgICAgIEBjb25maXJtX21lc3NhZ2UgPSBAb3B0aW9ucy5jb25maXJtX21lc3NhZ2Ugb3IgJ0ZpbGVzIGFyZSBzdGlsbCBiZWluZyB1cGxvYWRlZC4nXG4gICAgICBAYWxsb3dlZF90eXBlcyA9IEBvcHRpb25zLmFsbG93ZWRfdHlwZXNcbiAgICAgIEBtYXhfc2l6ZSA9IEBvcHRpb25zLm1heF9zaXplXG5cbiAgICAgIEBhY3RpdmVfZmlsZXMgPSAwXG5cbiAgICAgIEBzZWxlY3Rvcj8uYmluZCAnY2hhbmdlJywgKGUpID0+XG4gICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyKGUpXG5cbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiBAZHJvcF9hcmVhPyBhbmQgeGhyLnVwbG9hZFxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcmFnb3ZlcicsIEBmaWxlX2RyYWdfaG92ZXJcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJhZ2xlYXZlJywgQGZpbGVfZHJhZ19ob3ZlclxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcm9wJywgKGUpID0+XG4gICAgICAgICAgQGZpbGVfc2VsZWN0X2hhbmRsZXIgZVxuICAgICAgICBAZHJvcF9hcmVhLnNob3coKVxuXG4gICAgICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSA9PlxuICAgICAgICBpZiBAY29uZmlybV9tZXNzYWdlPyBhbmQgQGFjdGl2ZV9maWxlcyA+IDBcbiAgICAgICAgICByZXR1cm4gQGNvbmZpcm1fbWVzc2FnZVxuXG4gICAgZmlsZV9kcmFnX2hvdmVyOiAoZSkgPT5cbiAgICAgIGlmIG5vdCBAZHJvcF9hcmVhP1xuICAgICAgICByZXR1cm5cbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgaWYgZS50eXBlIGlzICdkcmFnb3ZlcidcbiAgICAgICAgQGRyb3BfYXJlYS5hZGRDbGFzcyAnZHJhZy1ob3ZlcidcbiAgICAgIGVsc2VcbiAgICAgICAgQGRyb3BfYXJlYS5yZW1vdmVDbGFzcyAnZHJhZy1ob3ZlcidcblxuICAgIGZpbGVfc2VsZWN0X2hhbmRsZXI6IChlKSA9PlxuICAgICAgQGZpbGVfZHJhZ19ob3ZlcihlKVxuICAgICAgZmlsZXMgPSBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyPy5maWxlcyBvciBlLnRhcmdldD8uZmlsZXMgb3IgZS5kYXRhVHJhbnNmZXI/LmZpbGVzXG4gICAgICBpZiBmaWxlcz8ubGVuZ3RoID4gMFxuICAgICAgICBAdXBsb2FkX2ZpbGVzKGZpbGVzKVxuXG4gICAgdXBsb2FkX2ZpbGVzOiAoZmlsZXMpID0+XG4gICAgICBAZ2V0X3VwbG9hZF91cmxzIGZpbGVzLmxlbmd0aCwgKGVycm9yLCB1cmxzKSA9PlxuICAgICAgICBpZiBlcnJvclxuICAgICAgICAgIGNvbnNvbGUubG9nICdFcnJvciBnZXR0aW5nIFVSTHMnLCBlcnJvclxuICAgICAgICAgIHJldHVyblxuICAgICAgICBAcHJvY2Vzc19maWxlcyBmaWxlcywgdXJscywgMFxuXG4gICAgZ2V0X3VwbG9hZF91cmxzOiAobiwgY2FsbGJhY2spID0+XG4gICAgICByZXR1cm4gaWYgbiA8PSAwXG4gICAgICBhcGlfY2FsbCAnR0VUJywgQHVwbG9hZF91cmwsIHtjb3VudDogbn0sIChlcnJvciwgcmVzdWx0KSAtPlxuICAgICAgICBpZiBlcnJvclxuICAgICAgICAgIGNhbGxiYWNrIGVycm9yXG4gICAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgICAgY2FsbGJhY2sgdW5kZWZpbmVkLCByZXN1bHRcblxuICAgIHByb2Nlc3NfZmlsZXM6IChmaWxlcywgdXJscywgaSkgPT5cbiAgICAgIHJldHVybiBpZiBpID49IGZpbGVzLmxlbmd0aFxuICAgICAgQHVwbG9hZF9maWxlIGZpbGVzW2ldLCB1cmxzW2ldLnVwbG9hZF91cmwsIEB1cGxvYWRfaGFuZGxlcj8ucHJldmlldyhmaWxlc1tpXSksICgpID0+XG4gICAgICAgIEBwcm9jZXNzX2ZpbGVzIGZpbGVzLCB1cmxzLCBpICsgMSwgQHVwbG9hZF9oYW5kbGVyP1xuXG4gICAgdXBsb2FkX2ZpbGU6IChmaWxlLCB1cmwsIHByb2dyZXNzLCBjYWxsYmFjaykgPT5cbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiBAYWxsb3dlZF90eXBlcz8ubGVuZ3RoID4gMFxuICAgICAgICBpZiBmaWxlLnR5cGUgbm90IGluIEBhbGxvd2VkX3R5cGVzXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnd3JvbmdfdHlwZSdcbiAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIEBtYXhfc2l6ZT9cbiAgICAgICAgaWYgZmlsZS5zaXplID4gQG1heF9zaXplXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAndG9vX2JpZydcbiAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICMgJCgnI2ltYWdlJykudmFsKGZpbGUubmFtZSk7XG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIgJ3Byb2dyZXNzJywgKGV2ZW50KSAtPlxuICAgICAgICBwcm9ncmVzcyBwYXJzZUludCBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCAqIDEwMC4wXG5cbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoZXZlbnQpID0+XG4gICAgICAgIGlmIHhoci5yZWFkeVN0YXRlID09IDRcbiAgICAgICAgICBpZiB4aHIuc3RhdHVzID09IDIwMFxuICAgICAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpXG4gICAgICAgICAgICBwcm9ncmVzcyAxMDAuMCwgcmVzcG9uc2UucmVzdWx0XG4gICAgICAgICAgICAjIC8vJCgnI2NvbnRlbnQnKS52YWwoeGhyLnJlc3BvbnNlVGV4dClcbiAgICAgICAgICAgICQoJyNpbWFnZScpLnZhbCgkKCcjaW1hZ2UnKS52YWwoKSAgKyByZXNwb25zZS5yZXN1bHQuaWQgKyAnOycpO1xuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnZXJyb3InXG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcblxuICAgICAgeGhyLm9wZW4gJ1BPU1QnLCB1cmwsIHRydWVcbiAgICAgIGRhdGEgPSBuZXcgRm9ybURhdGEoKVxuICAgICAgZGF0YS5hcHBlbmQgJ2ZpbGUnLCBmaWxlXG4gICAgICB4aHIuc2VuZCBkYXRhXG4gICAgICBjYWxsYmFjaygpXG4pKCkiLCJ3aW5kb3cuTE9HID0gLT5cbiAgY29uc29sZT8ubG9nPyBhcmd1bWVudHMuLi5cblxuXG53aW5kb3cuaW5pdF9jb21tb24gPSAtPlxuICBpbml0X2xvYWRpbmdfYnV0dG9uKClcbiAgaW5pdF9jb25maXJtX2J1dHRvbigpXG4gIGluaXRfcGFzc3dvcmRfc2hvd19idXR0b24oKVxuICBpbml0X3RpbWUoKVxuICBpbml0X2Fubm91bmNlbWVudCgpXG4gIGluaXRfcm93X2xpbmsoKVxuXG5cbndpbmRvdy5pbml0X2xvYWRpbmdfYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWxvYWRpbmcnLCAtPlxuICAgICQodGhpcykuYnV0dG9uICdsb2FkaW5nJ1xuXG5cbndpbmRvdy5pbml0X2NvbmZpcm1fYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWNvbmZpcm0nLCAtPlxuICAgIGlmIG5vdCBjb25maXJtICQodGhpcykuZGF0YSgnbWVzc2FnZScpIG9yICdBcmUgeW91IHN1cmU/J1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxuXG5cbndpbmRvdy5pbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLXBhc3N3b3JkLXNob3cnLCAtPlxuICAgICR0YXJnZXQgPSAkKCQodGhpcykuZGF0YSAndGFyZ2V0JylcbiAgICAkdGFyZ2V0LmZvY3VzKClcbiAgICBpZiAkKHRoaXMpLmhhc0NsYXNzICdhY3RpdmUnXG4gICAgICAkdGFyZ2V0LmF0dHIgJ3R5cGUnLCAncGFzc3dvcmQnXG4gICAgZWxzZVxuICAgICAgJHRhcmdldC5hdHRyICd0eXBlJywgJ3RleHQnXG5cblxud2luZG93LmluaXRfdGltZSA9IC0+XG4gIGlmICQoJ3RpbWUnKS5sZW5ndGggPiAwXG4gICAgcmVjYWxjdWxhdGUgPSAtPlxuICAgICAgJCgndGltZVtkYXRldGltZV0nKS5lYWNoIC0+XG4gICAgICAgIGRhdGUgPSBtb21lbnQudXRjICQodGhpcykuYXR0ciAnZGF0ZXRpbWUnXG4gICAgICAgIGRpZmYgPSBtb21lbnQoKS5kaWZmIGRhdGUgLCAnZGF5cydcbiAgICAgICAgaWYgZGlmZiA+IDI1XG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUubG9jYWwoKS5mb3JtYXQgJ1lZWVktTU0tREQnXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAkKHRoaXMpLnRleHQgZGF0ZS5mcm9tTm93KClcbiAgICAgICAgJCh0aGlzKS5hdHRyICd0aXRsZScsIGRhdGUubG9jYWwoKS5mb3JtYXQgJ2RkZGQsIE1NTU0gRG8gWVlZWSwgSEg6bW06c3MgWidcbiAgICAgIHNldFRpbWVvdXQgYXJndW1lbnRzLmNhbGxlZSwgMTAwMCAqIDQ1XG4gICAgcmVjYWxjdWxhdGUoKVxuXG5cbndpbmRvdy5pbml0X2Fubm91bmNlbWVudCA9IC0+XG4gICQoJy5hbGVydC1hbm5vdW5jZW1lbnQgYnV0dG9uLmNsb3NlJykuY2xpY2sgLT5cbiAgICBzZXNzaW9uU3RvcmFnZT8uc2V0SXRlbSAnY2xvc2VkQW5ub3VuY2VtZW50JywgJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLmh0bWwoKVxuXG4gIGlmIHNlc3Npb25TdG9yYWdlPy5nZXRJdGVtKCdjbG9zZWRBbm5vdW5jZW1lbnQnKSAhPSAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXG4gICAgJCgnLmFsZXJ0LWFubm91bmNlbWVudCcpLnNob3coKVxuXG5cbndpbmRvdy5pbml0X3Jvd19saW5rID0gLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcucm93LWxpbmsnLCAtPlxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJCh0aGlzKS5kYXRhICdocmVmJ1xuXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLm5vdC1saW5rJywgKGUpIC0+XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuXG5cbndpbmRvdy5jbGVhcl9ub3RpZmljYXRpb25zID0gLT5cbiAgJCgnI25vdGlmaWNhdGlvbnMnKS5lbXB0eSgpXG5cblxud2luZG93LnNob3dfbm90aWZpY2F0aW9uID0gKG1lc3NhZ2UsIGNhdGVnb3J5PSd3YXJuaW5nJykgLT5cbiAgY2xlYXJfbm90aWZpY2F0aW9ucygpXG4gIHJldHVybiBpZiBub3QgbWVzc2FnZVxuXG4gICQoJyNub3RpZmljYXRpb25zJykuYXBwZW5kIFwiXCJcIlxuICAgICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LWRpc21pc3NhYmxlIGFsZXJ0LSN7Y2F0ZWdvcnl9XCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY2xvc2VcIiBkYXRhLWRpc21pc3M9XCJhbGVydFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPiZ0aW1lczs8L2J1dHRvbj5cbiAgICAgICAgI3ttZXNzYWdlfVxuICAgICAgPC9kaXY+XG4gICAgXCJcIlwiXG5cblxud2luZG93LnNpemVfaHVtYW4gPSAobmJ5dGVzKSAtPlxuICBmb3Igc3VmZml4IGluIFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddXG4gICAgaWYgbmJ5dGVzIDwgMTAwMFxuICAgICAgaWYgc3VmZml4ID09ICdCJ1xuICAgICAgICByZXR1cm4gXCIje25ieXRlc30gI3tzdWZmaXh9XCJcbiAgICAgIHJldHVybiBcIiN7cGFyc2VJbnQobmJ5dGVzICogMTApIC8gMTB9ICN7c3VmZml4fVwiXG4gICAgbmJ5dGVzIC89IDEwMjQuMFxuIiwiJCAtPlxuICBpbml0X2NvbW1vbigpXG5cbiQgLT4gJCgnaHRtbC5hdXRoJykuZWFjaCAtPlxuICBpbml0X2F1dGgoKVxuXG4kIC0+ICQoJ2h0bWwudXNlci1saXN0JykuZWFjaCAtPlxuICBpbml0X3VzZXJfbGlzdCgpXG5cbiQgLT4gJCgnaHRtbC51c2VyLW1lcmdlJykuZWFjaCAtPlxuICBpbml0X3VzZXJfbWVyZ2UoKVxuXG4kIC0+ICQoJ2h0bWwucmVzb3VyY2UtbGlzdCcpLmVhY2ggLT5cbiAgaW5pdF9yZXNvdXJjZV9saXN0KClcblxuJCAtPiAkKCdodG1sLnJlc291cmNlLXZpZXcnKS5lYWNoIC0+XG4gIGluaXRfcmVzb3VyY2VfdmlldygpXG5cbiQgLT4gJCgnaHRtbC5wb3N0LWNyZWF0ZScpLmVhY2ggLT5cbiAgaW5pdF9yZXNvdXJjZV91cGxvYWQoKVxuXG4kIC0+ICQoJ2h0bWwucmVjb21tZW5kZXItY3JlYXRlJykuZWFjaCAtPlxuICBpbml0X3Jlc291cmNlX3VwbG9hZCgpXG5cbiIsIndpbmRvdy5pbml0X2F1dGggPSAtPlxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UgLT5cbiAgICBidXR0b25zID0gJCgnLmJ0bi1zb2NpYWwnKS50b0FycmF5KCkuY29uY2F0ICQoJy5idG4tc29jaWFsLWljb24nKS50b0FycmF5KClcbiAgICBmb3IgYnV0dG9uIGluIGJ1dHRvbnNcbiAgICAgIGhyZWYgPSAkKGJ1dHRvbikucHJvcCAnaHJlZidcbiAgICAgIGlmICQoJy5yZW1lbWJlciBpbnB1dCcpLmlzICc6Y2hlY2tlZCdcbiAgICAgICAgJChidXR0b24pLnByb3AgJ2hyZWYnLCBcIiN7aHJlZn0mcmVtZW1iZXI9dHJ1ZVwiXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgICQoYnV0dG9uKS5wcm9wICdocmVmJywgaHJlZi5yZXBsYWNlICcmcmVtZW1iZXI9dHJ1ZScsICcnXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCBmYWxzZVxuXG4gICQoJy5yZW1lbWJlcicpLmNoYW5nZSgpXG4iLCIjIGh0dHA6Ly9ibG9nLmFub3JnYW4uY29tLzIwMTIvMDkvMzAvcHJldHR5LW11bHRpLWZpbGUtdXBsb2FkLWJvb3RzdHJhcC1qcXVlcnktdHdpZy1zaWxleC9cbmlmICQoXCIucHJldHR5LWZpbGVcIikubGVuZ3RoXG4gICQoXCIucHJldHR5LWZpbGVcIikuZWFjaCAoKSAtPlxuICAgIHByZXR0eV9maWxlID0gJCh0aGlzKVxuICAgIGZpbGVfaW5wdXQgPSBwcmV0dHlfZmlsZS5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpXG4gICAgZmlsZV9pbnB1dC5oaWRlKClcbiAgICBmaWxlX2lucHV0LmNoYW5nZSAoKSAtPlxuICAgICAgZmlsZXMgPSBmaWxlX2lucHV0WzBdLmZpbGVzXG4gICAgICBpbmZvID0gXCJcIlxuICAgICAgaWYgZmlsZXMubGVuZ3RoID4gMVxuICAgICAgICBpbmZvID0gXCIje2ZpbGVzLmxlbmd0aH0gZmlsZXMgc2VsZWN0ZWRcIlxuICAgICAgZWxzZVxuICAgICAgICBwYXRoID0gZmlsZV9pbnB1dC52YWwoKS5zcGxpdChcIlxcXFxcIilcbiAgICAgICAgaW5mbyA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXVxuICAgICAgcHJldHR5X2ZpbGUuZmluZChcIi5pbnB1dC1ncm91cCBpbnB1dFwiKS52YWwoaW5mbylcbiAgICBwcmV0dHlfZmlsZS5maW5kKFwiLmlucHV0LWdyb3VwXCIpLmNsaWNrIChlKSAtPlxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBmaWxlX2lucHV0LmNsaWNrKClcbiAgICAgICQodGhpcykuYmx1cigpXG4iLCJ3aW5kb3cuaW5pdF9yZXNvdXJjZV9saXN0ID0gKCkgLT5cbiAgaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uKClcblxud2luZG93LmluaXRfcmVzb3VyY2VfdmlldyA9ICgpIC0+XG4gIGluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbigpXG5cbndpbmRvdy5pbml0X3Jlc291cmNlX3VwbG9hZCA9ICgpIC0+XG5cbiAgaWYgd2luZG93LkZpbGUgYW5kIHdpbmRvdy5GaWxlTGlzdCBhbmQgd2luZG93LkZpbGVSZWFkZXJcbiAgICB3aW5kb3cuZmlsZV91cGxvYWRlciA9IG5ldyBGaWxlVXBsb2FkZXJcbiAgICAgIHVwbG9hZF9oYW5kbGVyOiB1cGxvYWRfaGFuZGxlclxuICAgICAgc2VsZWN0b3I6ICQoJy5maWxlJylcbiAgICAgIGRyb3BfYXJlYTogJCgnLmRyb3AtYXJlYScpXG4gICAgICBjb25maXJtX21lc3NhZ2U6ICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xuICAgICAgdXBsb2FkX3VybDogJCgnLmZpbGUnKS5kYXRhKCdnZXQtdXBsb2FkLXVybCcpXG4gICAgICBhbGxvd2VkX3R5cGVzOiBbXVxuICAgICAgbWF4X3NpemU6IDEwMjQgKiAxMDI0ICogMTAyNFxuXG51cGxvYWRfaGFuZGxlciA9XG4gIHByZXZpZXc6IChmaWxlKSAtPlxuICAgICRyZXNvdXJjZSA9ICQgXCJcIlwiXG4gICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtbGctMiBjb2wtbWQtMyBjb2wtc20tNCBjb2wteHMtNlwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0aHVtYm5haWxcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcmV2aWV3XCI+PC9kaXY+XG4gICAgICAgICAgICA8aDU+I3tmaWxlLm5hbWV9PC9oNT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtYmFyXCIgc3R5bGU9XCJ3aWR0aDogMCU7XCI+PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy10ZXh0XCI+PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICBcIlwiXCJcbiAgICAkcHJldmlldyA9ICQoJy5wcmV2aWV3JywgJHJlc291cmNlKVxuXG4gICAgaWYgZmlsZV91cGxvYWRlci5hY3RpdmVfZmlsZXMgPCAxNiBhbmQgZmlsZS50eXBlLmluZGV4T2YoXCJpbWFnZVwiKSBpcyAwXG4gICAgICByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgICByZWFkZXIub25sb2FkID0gKGUpID0+XG4gICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7ZS50YXJnZXQucmVzdWx0fSlcIilcbiAgICAgIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpXG4gICAgZWxzZVxuICAgICAgJHByZXZpZXcudGV4dChmaWxlLnR5cGUgb3IgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpXG5cbiAgICAkKCcucmVzb3VyY2UtdXBsb2FkcycpLnByZXBlbmQoJHJlc291cmNlKVxuXG4gICAgKHByb2dyZXNzLCByZXNvdXJjZSwgZXJyb3IpID0+XG4gICAgICBpZiBlcnJvclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5hZGRDbGFzcygncHJvZ3Jlc3MtYmFyLWRhbmdlcicpXG4gICAgICAgIGlmIGVycm9yID09ICd0b29fYmlnJ1xuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiRmFpbGVkISBUb28gYmlnLCBtYXg6ICN7c2l6ZV9odW1hbihmaWxlX3VwbG9hZGVyLm1heF9zaXplKX0uXCIpXG4gICAgICAgIGVsc2UgaWYgZXJyb3IgPT0gJ3dyb25nX3R5cGUnXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCJGYWlsZWQhIFdyb25nIGZpbGUgdHlwZS5cIilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KCdGYWlsZWQhJylcbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIHByb2dyZXNzID09IDEwMC4wIGFuZCByZXNvdXJjZVxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5hZGRDbGFzcygncHJvZ3Jlc3MtYmFyLXN1Y2Nlc3MnKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIlN1Y2Nlc3MgI3tzaXplX2h1bWFuKGZpbGUuc2l6ZSl9XCIpXG4gICAgICAgIGlmIHJlc291cmNlLmltYWdlX3VybCBhbmQgJHByZXZpZXcudGV4dCgpLmxlbmd0aCA+IDBcbiAgICAgICAgICAkcHJldmlldy5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCBcInVybCgje3Jlc291cmNlLmltYWdlX3VybH0pXCIpXG4gICAgICAgICAgJHByZXZpZXcudGV4dCgnJylcbiAgICAgIGVsc2UgaWYgcHJvZ3Jlc3MgPT0gMTAwLjBcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuY3NzKCd3aWR0aCcsICcxMDAlJylcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCIxMDAlIC0gUHJvY2Vzc2luZy4uXCIpXG4gICAgICBlbHNlXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCBcIiN7cHJvZ3Jlc3N9JVwiKVxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIiN7cHJvZ3Jlc3N9JSBvZiAje3NpemVfaHVtYW4oZmlsZS5zaXplKX1cIilcblxuXG53aW5kb3cuaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uID0gKCkgLT5cbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWRlbGV0ZScsIChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGlmIGNvbmZpcm0oJ1ByZXNzIE9LIHRvIGRlbGV0ZSB0aGUgcmVzb3VyY2UnKVxuICAgICAgJCh0aGlzKS5hdHRyKCdkaXNhYmxlZCcsICdkaXNhYmxlZCcpXG4gICAgICBhcGlfY2FsbCAnREVMRVRFJywgJCh0aGlzKS5kYXRhKCdhcGktdXJsJyksIChlcnIsIHJlc3VsdCkgPT5cbiAgICAgICAgaWYgZXJyXG4gICAgICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpXG4gICAgICAgICAgTE9HICdTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZyBkdXJpbmcgZGVsZXRlIScsIGVyclxuICAgICAgICAgIHJldHVyblxuICAgICAgICB0YXJnZXQgPSAkKHRoaXMpLmRhdGEoJ3RhcmdldCcpXG4gICAgICAgIHJlZGlyZWN0X3VybCA9ICQodGhpcykuZGF0YSgncmVkaXJlY3QtdXJsJylcbiAgICAgICAgaWYgdGFyZ2V0XG4gICAgICAgICAgJChcIiN7dGFyZ2V0fVwiKS5yZW1vdmUoKVxuICAgICAgICBpZiByZWRpcmVjdF91cmxcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlZGlyZWN0X3VybCIsIndpbmRvdy5pbml0X3VzZXJfbGlzdCA9IC0+XG4gIGluaXRfdXNlcl9zZWxlY3Rpb25zKClcbiAgaW5pdF91c2VyX2RlbGV0ZV9idG4oKVxuICBpbml0X3VzZXJfbWVyZ2VfYnRuKClcblxuXG5pbml0X3VzZXJfc2VsZWN0aW9ucyA9IC0+XG4gICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5lYWNoIC0+XG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcblxuICAkKCcjc2VsZWN0LWFsbCcpLmNoYW5nZSAtPlxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5wcm9wICdjaGVja2VkJywgJCh0aGlzKS5pcyAnOmNoZWNrZWQnXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXG5cbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAtPlxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXG5cblxudXNlcl9zZWxlY3Rfcm93ID0gKCRlbGVtZW50KSAtPlxuICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cbiAgICBpZCA9ICRlbGVtZW50LnZhbCgpXG4gICAgJChcIiMje2lkfVwiKS50b2dnbGVDbGFzcyAnd2FybmluZycsICRlbGVtZW50LmlzICc6Y2hlY2tlZCdcblxuXG51cGRhdGVfdXNlcl9zZWxlY3Rpb25zID0gLT5cbiAgc2VsZWN0ZWQgPSAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcbiAgJCgnI3VzZXItYWN0aW9ucycpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA9PSAwXG4gICQoJyN1c2VyLW1lcmdlJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkIDwgMlxuICBpZiBzZWxlY3RlZCBpcyAwXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2NoZWNrZWQnLCBmYWxzZVxuICBlbHNlIGlmICQoJ2lucHV0W25hbWU9dXNlcl9kYl06bm90KDpjaGVja2VkKScpLmxlbmd0aCBpcyAwXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdpbmRldGVybWluYXRlJywgZmFsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2NoZWNrZWQnLCB0cnVlXG4gIGVsc2VcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCB0cnVlXG5cblxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBEZWxldGUgVXNlcnMgU3R1ZmZcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbmluaXRfdXNlcl9kZWxldGVfYnRuID0gLT5cbiAgJCgnI3VzZXItZGVsZXRlJykuY2xpY2sgKGUpIC0+XG4gICAgY2xlYXJfbm90aWZpY2F0aW9ucygpXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgY29uZmlybV9tZXNzYWdlID0gKCQodGhpcykuZGF0YSAnY29uZmlybScpLnJlcGxhY2UgJ3t1c2Vyc30nLCAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcbiAgICBpZiBjb25maXJtIGNvbmZpcm1fbWVzc2FnZVxuICAgICAgdXNlcl9rZXlzID0gW11cbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06Y2hlY2tlZCcpLmVhY2ggLT5cbiAgICAgICAgJCh0aGlzKS5hdHRyICdkaXNhYmxlZCcsIHRydWVcbiAgICAgICAgdXNlcl9rZXlzLnB1c2ggJCh0aGlzKS52YWwoKVxuICAgICAgZGVsZXRlX3VybCA9ICQodGhpcykuZGF0YSAnYXBpLXVybCdcbiAgICAgIHN1Y2Nlc3NfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnc3VjY2VzcydcbiAgICAgIGVycm9yX21lc3NhZ2UgPSAkKHRoaXMpLmRhdGEgJ2Vycm9yJ1xuICAgICAgYXBpX2NhbGwgJ0RFTEVURScsIGRlbGV0ZV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5cy5qb2luKCcsJyl9LCAoZXJyLCByZXN1bHQpIC0+XG4gICAgICAgIGlmIGVyclxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl06ZGlzYWJsZWQnKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBlcnJvcl9tZXNzYWdlLnJlcGxhY2UoJ3t1c2Vyc30nLCB1c2VyX2tleXMubGVuZ3RoKSwgJ2RhbmdlcidcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgJChcIiMje3Jlc3VsdC5qb2luKCcsICMnKX1cIikuZmFkZU91dCAtPlxuICAgICAgICAgICQodGhpcykucmVtb3ZlKClcbiAgICAgICAgICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcbiAgICAgICAgICBzaG93X25vdGlmaWNhdGlvbiBzdWNjZXNzX21lc3NhZ2UucmVwbGFjZSgne3VzZXJzfScsIHVzZXJfa2V5cy5sZW5ndGgpLCAnc3VjY2VzcydcblxuXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIE1lcmdlIFVzZXJzIFN0dWZmXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG53aW5kb3cuaW5pdF91c2VyX21lcmdlID0gLT5cbiAgdXNlcl9rZXlzID0gJCgnI3VzZXJfa2V5cycpLnZhbCgpXG4gIGFwaV91cmwgPSAkKCcuYXBpLXVybCcpLmRhdGEgJ2FwaS11cmwnXG4gIGFwaV9jYWxsICdHRVQnLCBhcGlfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXN9LCAoZXJyb3IsIHJlc3VsdCkgLT5cbiAgICBpZiBlcnJvclxuICAgICAgTE9HICdTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZydcbiAgICAgIHJldHVyblxuICAgIHdpbmRvdy51c2VyX2RicyA9IHJlc3VsdFxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcblxuICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykuY2hhbmdlIChldmVudCkgLT5cbiAgICB1c2VyX2tleSA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKClcbiAgICBzZWxlY3RfZGVmYXVsdF91c2VyIHVzZXJfa2V5XG5cblxuc2VsZWN0X2RlZmF1bHRfdXNlciA9ICh1c2VyX2tleSkgLT5cbiAgJCgnLnVzZXItcm93JykucmVtb3ZlQ2xhc3MoJ3N1Y2Nlc3MnKS5hZGRDbGFzcyAnZGFuZ2VyJ1xuICAkKFwiIyN7dXNlcl9rZXl9XCIpLnJlbW92ZUNsYXNzKCdkYW5nZXInKS5hZGRDbGFzcyAnc3VjY2VzcydcblxuICBmb3IgdXNlcl9kYiBpbiB1c2VyX2Ric1xuICAgIGlmIHVzZXJfa2V5ID09IHVzZXJfZGIua2V5XG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfa2V5XScpLnZhbCB1c2VyX2RiLmtleVxuICAgICAgJCgnaW5wdXRbbmFtZT11c2VybmFtZV0nKS52YWwgdXNlcl9kYi51c2VybmFtZVxuICAgICAgJCgnaW5wdXRbbmFtZT1uYW1lXScpLnZhbCB1c2VyX2RiLm5hbWVcbiAgICAgICQoJ2lucHV0W25hbWU9ZW1haWxdJykudmFsIHVzZXJfZGIuZW1haWxcbiAgICAgIGJyZWFrXG5cblxuaW5pdF91c2VyX21lcmdlX2J0biA9IC0+XG4gICQoJyN1c2VyLW1lcmdlJykuY2xpY2sgKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgdXNlcl9rZXlzID0gW11cbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XG4gICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXG4gICAgdXNlcl9tZXJnZV91cmwgPSAkKHRoaXMpLmRhdGEgJ3VzZXItbWVyZ2UtdXJsJ1xuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gXCIje3VzZXJfbWVyZ2VfdXJsfT91c2VyX2tleXM9I3t1c2VyX2tleXMuam9pbignLCcpfVwiXG4iLCJcbmZ1bmN0aW9uIGZvbGxvd0Z1bmN0aW9uKHgsIHkpIHtcblxuICAgIGFwaV91cmwgPSAnL2FwaS92MS9mb2xsb3cvJyArIHkgKyAnLyc7XG5cbiAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImxhYmVsLWRlZmF1bHRcIikpe1xuICAgICAgICAgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJub3QtbG9nZ2VkLWluXCIpKXtcbi8vICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuY3NzKHtcInZpc2liaWxpdHlcIjpcInZpc2libGVcIixcImRpc3BsYXlcIjpcImJsb2NrXCJ9KTtcbiAgICAgICAgICAgICQoXCIucmVjb21tZW5kZXJcIikuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xuICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuZmFkZUluKCk7XG4vLyAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlT3V0KCk7XG4gICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJsYWJlbC1kZWZhdWx0XCIpXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJsYWJlbC1zdWNjZXNzXCIpXG4gICAgICAgICAgICB4LmlubmVySFRNTD0nRk9MTE9XSU5HJztcbiAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsICAgIC8vWW91ciBhcGkgdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnUFVUJywgICAvL3R5cGUgaXMgYW55IEhUVFAgbWV0aG9kXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sICAgICAgLy9EYXRhIGFzIGpzIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJsYWJlbC1zdWNjZXNzXCIpKXtcblxuICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJsYWJlbC1zdWNjZXNzXCIpXG4gICAgICAgIHguY2xhc3NMaXN0LmFkZChcImxhYmVsLWRlZmF1bHRcIilcbiAgICAgICAgeC5pbm5lckhUTUwgPSAnRk9MTE9XJztcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnREVMRVRFJyxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIDtcbiAgICB9XG5cbn1cblxuJCgnLmNsb3NlLWljb24nKS5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xuICAkKHRoaXMpLmNsb3Nlc3QoJy5jYXJkJykuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xuICAkKFwiLnJlY29tbWVuZGVyXCIpLmZhZGVJbigpO1xufSkiLCIvLyhmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LGZhY3Rvcnkpe2lmKHR5cGVvZiBleHBvcnRzPT09XCJvYmplY3RcIiYmdHlwZW9mIG1vZHVsZT09PVwib2JqZWN0XCIpbW9kdWxlLmV4cG9ydHM9ZmFjdG9yeSgpO2Vsc2UgaWYodHlwZW9mIGRlZmluZT09PVwiZnVuY3Rpb25cIiYmZGVmaW5lLmFtZClkZWZpbmUoXCJHaWZmZmVyXCIsW10sZmFjdG9yeSk7ZWxzZSBpZih0eXBlb2YgZXhwb3J0cz09PVwib2JqZWN0XCIpZXhwb3J0c1tcIkdpZmZmZXJcIl09ZmFjdG9yeSgpO2Vsc2Ugcm9vdFtcIkdpZmZmZXJcIl09ZmFjdG9yeSgpfSkodGhpcyxmdW5jdGlvbigpe3ZhciBkPWRvY3VtZW50O3ZhciBwbGF5U2l6ZT02MDt2YXIgR2lmZmZlcj1mdW5jdGlvbihvcHRpb25zKXt2YXIgaW1hZ2VzLGk9MCxnaWZzPVtdO2ltYWdlcz1kLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1naWZmZmVyXVwiKTtmb3IoO2k8aW1hZ2VzLmxlbmd0aDsrK2kpcHJvY2VzcyhpbWFnZXNbaV0sZ2lmcyxvcHRpb25zKTtyZXR1cm4gZ2lmc307ZnVuY3Rpb24gZm9ybWF0VW5pdCh2KXtyZXR1cm4gdisodi50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjA/XCJcIjpcInB4XCIpfWZ1bmN0aW9uIHBhcnNlU3R5bGVzKHN0eWxlcyl7dmFyIHN0eWxlc1N0cj1cIlwiO2Zvcihwcm9wIGluIHN0eWxlcylzdHlsZXNTdHIrPXByb3ArXCI6XCIrc3R5bGVzW3Byb3BdK1wiO1wiO3JldHVybiBzdHlsZXNTdHJ9ZnVuY3Rpb24gY3JlYXRlQ29udGFpbmVyKHcsaCxlbCxhbHRUZXh0LG9wdHMpe3ZhciBhbHQ7dmFyIGNvbj1kLmNyZWF0ZUVsZW1lbnQoXCJCVVRUT05cIik7dmFyIGNscz1lbC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKTt2YXIgaWQ9ZWwuZ2V0QXR0cmlidXRlKFwiaWRcIik7dmFyIHBsYXlCdXR0b25TdHlsZXM9b3B0cyYmb3B0cy5wbGF5QnV0dG9uU3R5bGVzP3BhcnNlU3R5bGVzKG9wdHMucGxheUJ1dHRvblN0eWxlcyk6W1wid2lkdGg6XCIrcGxheVNpemUrXCJweFwiLFwiaGVpZ2h0OlwiK3BsYXlTaXplK1wicHhcIixcImJvcmRlci1yYWRpdXM6XCIrcGxheVNpemUvMitcInB4XCIsXCJiYWNrZ3JvdW5kOnJnYmEoMCwgMCwgMCwgMC4zKVwiLFwicG9zaXRpb246YWJzb2x1dGVcIixcInRvcDo1MCVcIixcImxlZnQ6NTAlXCIsXCJtYXJnaW46LVwiK3BsYXlTaXplLzIrXCJweFwiXS5qb2luKFwiO1wiKTt2YXIgcGxheUJ1dHRvbkljb25TdHlsZXM9b3B0cyYmb3B0cy5wbGF5QnV0dG9uSWNvblN0eWxlcz9wYXJzZVN0eWxlcyhvcHRzLnBsYXlCdXR0b25JY29uU3R5bGVzKTpbXCJ3aWR0aDogMFwiLFwiaGVpZ2h0OiAwXCIsXCJib3JkZXItdG9wOiAxNHB4IHNvbGlkIHRyYW5zcGFyZW50XCIsXCJib3JkZXItYm90dG9tOiAxNHB4IHNvbGlkIHRyYW5zcGFyZW50XCIsXCJib3JkZXItbGVmdDogMTRweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSlcIixcInBvc2l0aW9uOiBhYnNvbHV0ZVwiLFwibGVmdDogMjZweFwiLFwidG9wOiAxNnB4XCJdLmpvaW4oXCI7XCIpO2Nscz9jb24uc2V0QXR0cmlidXRlKFwiY2xhc3NcIixlbC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSk6bnVsbDtpZD9jb24uc2V0QXR0cmlidXRlKFwiaWRcIixlbC5nZXRBdHRyaWJ1dGUoXCJpZFwiKSk6bnVsbDtjb24uc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInBvc2l0aW9uOnJlbGF0aXZlO2N1cnNvcjpwb2ludGVyO2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtwYWRkaW5nOjA7XCIpO2Nvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWhpZGRlblwiLFwidHJ1ZVwiKTt2YXIgcGxheT1kLmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7cGxheS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLFwiZ2lmZmZlci1wbGF5LWJ1dHRvblwiKTtwbGF5LnNldEF0dHJpYnV0ZShcInN0eWxlXCIscGxheUJ1dHRvblN0eWxlcyk7dmFyIHRybmdsPWQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTt0cm5nbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLHBsYXlCdXR0b25JY29uU3R5bGVzKTtwbGF5LmFwcGVuZENoaWxkKHRybmdsKTtpZihhbHRUZXh0KXthbHQ9ZC5jcmVhdGVFbGVtZW50KFwicFwiKTthbHQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIixcImdpZmZmZXItYWx0XCIpO2FsdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiYm9yZGVyOjA7Y2xpcDpyZWN0KDAgMCAwIDApO2hlaWdodDoxcHg7b3ZlcmZsb3c6aGlkZGVuO3BhZGRpbmc6MDtwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDoxcHg7XCIpO2FsdC5pbm5lclRleHQ9YWx0VGV4dCtcIiwgaW1hZ2VcIn1jb24uYXBwZW5kQ2hpbGQocGxheSk7ZWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY29uLGVsKTthbHRUZXh0P2Nvbi5wYXJlbnROb2RlLmluc2VydEJlZm9yZShhbHQsY29uLm5leHRTaWJsaW5nKTpudWxsO3JldHVybntjOmNvbixwOnBsYXl9fWZ1bmN0aW9uIGNhbGN1bGF0ZVBlcmNlbnRhZ2VEaW0oZWwsdyxoLHdPcmlnLGhPcmlnKXt2YXIgcGFyZW50RGltVz1lbC5wYXJlbnROb2RlLm9mZnNldFdpZHRoO3ZhciBwYXJlbnREaW1IPWVsLnBhcmVudE5vZGUub2Zmc2V0SGVpZ2h0O3ZhciByYXRpbz13T3JpZy9oT3JpZztpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7dz1wYXJzZUludCh3LnRvU3RyaW5nKCkucmVwbGFjZShcIiVcIixcIlwiKSk7dz13LzEwMCpwYXJlbnREaW1XO2g9dy9yYXRpb31lbHNlIGlmKGgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtoPXBhcnNlSW50KGgudG9TdHJpbmcoKS5yZXBsYWNlKFwiJVwiLFwiXCIpKTtoPWgvMTAwKnBhcmVudERpbVc7dz1oL3JhdGlvfXJldHVybnt3OncsaDpofX1mdW5jdGlvbiBwcm9jZXNzKGVsLGdpZnMsb3B0aW9ucyl7dmFyIHVybCxjb24sYyx3LGgsZHVyYXRpb24scGxheSxnaWYscGxheWluZz1mYWxzZSxjYyxpc0MsZHVyYXRpb25UaW1lb3V0LGRpbXMsYWx0VGV4dDt1cmw9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyXCIpO3c9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLXdpZHRoXCIpO2g9ZWwuZ2V0QXR0cmlidXRlKFwiZGF0YS1naWZmZmVyLWhlaWdodFwiKTtkdXJhdGlvbj1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItZHVyYXRpb25cIik7YWx0VGV4dD1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItYWx0XCIpO2VsLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiO2M9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtpc0M9ISEoYy5nZXRDb250ZXh0JiZjLmdldENvbnRleHQoXCIyZFwiKSk7aWYodyYmaCYmaXNDKWNjPWNyZWF0ZUNvbnRhaW5lcih3LGgsZWwsYWx0VGV4dCxvcHRpb25zKTtlbC5vbmxvYWQ9ZnVuY3Rpb24oKXtpZighaXNDKXJldHVybjt3PXd8fGVsLndpZHRoO2g9aHx8ZWwuaGVpZ2h0O2lmKCFjYyljYz1jcmVhdGVDb250YWluZXIodyxoLGVsLGFsdFRleHQsb3B0aW9ucyk7Y29uPWNjLmM7cGxheT1jYy5wO2RpbXM9Y2FsY3VsYXRlUGVyY2VudGFnZURpbShjb24sdyxoLGVsLndpZHRoLGVsLmhlaWdodCk7Z2lmcy5wdXNoKGNvbik7Y29uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLGZ1bmN0aW9uKCl7Y2xlYXJUaW1lb3V0KGR1cmF0aW9uVGltZW91dCk7aWYoIXBsYXlpbmcpe3BsYXlpbmc9dHJ1ZTtnaWY9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIklNR1wiKTtnaWYuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcIndpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7XCIpO2dpZi5zZXRBdHRyaWJ1dGUoXCJkYXRhLXVyaVwiLE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoxZTUpKzEpO3NldFRpbWVvdXQoZnVuY3Rpb24oKXtnaWYuc3JjPXVybH0sMCk7Y29uLnJlbW92ZUNoaWxkKHBsYXkpO2Nvbi5yZW1vdmVDaGlsZChjKTtjb24uYXBwZW5kQ2hpbGQoZ2lmKTtpZihwYXJzZUludChkdXJhdGlvbik+MCl7ZHVyYXRpb25UaW1lb3V0PXNldFRpbWVvdXQoZnVuY3Rpb24oKXtwbGF5aW5nPWZhbHNlO2Nvbi5hcHBlbmRDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoZ2lmKTtjb24uYXBwZW5kQ2hpbGQoYyk7Z2lmPW51bGx9LGR1cmF0aW9uKX19ZWxzZXtwbGF5aW5nPWZhbHNlO2Nvbi5hcHBlbmRDaGlsZChwbGF5KTtjb24ucmVtb3ZlQ2hpbGQoZ2lmKTtjb24uYXBwZW5kQ2hpbGQoYyk7Z2lmPW51bGx9fSk7Yy53aWR0aD1kaW1zLnc7Yy5oZWlnaHQ9ZGltcy5oO2MuZ2V0Q29udGV4dChcIjJkXCIpLmRyYXdJbWFnZShlbCwwLDAsZGltcy53LGRpbXMuaCk7Y29uLmFwcGVuZENoaWxkKGMpO2Nvbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwicG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7d2lkdGg6XCIrZGltcy53K1wicHg7aGVpZ2h0OlwiK2RpbXMuaCtcInB4O2JhY2tncm91bmQ6bm9uZTtib3JkZXI6bm9uZTtwYWRkaW5nOjA7XCIpO2Muc3R5bGUud2lkdGg9XCIxMDAlXCI7Yy5zdHlsZS5oZWlnaHQ9XCIxMDAlXCI7aWYody50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjAmJmgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9dztjb24uc3R5bGUuaGVpZ2h0PWh9ZWxzZSBpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCl7Y29uLnN0eWxlLndpZHRoPXc7Y29uLnN0eWxlLmhlaWdodD1cImluaGVyaXRcIn1lbHNlIGlmKGgudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9XCJpbmhlcml0XCI7Y29uLnN0eWxlLmhlaWdodD1ofWVsc2V7Y29uLnN0eWxlLndpZHRoPWRpbXMudytcInB4XCI7Y29uLnN0eWxlLmhlaWdodD1kaW1zLmgrXCJweFwifX07ZWwuc3JjPXVybH1yZXR1cm4gR2lmZmZlcn0pOyIsIlxuLy8gRm9sbG93aW5nIGNvZGUgYWRkcyB0eXBlYWhlYWQga2V5d29yZHMgdG8gc2VhcmNoIGJhcnNcblxudmFyIGtleXdvcmRzID0gbmV3IEJsb29kaG91bmQoe1xuICAgIGRhdHVtVG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMub2JqLndoaXRlc3BhY2UoJ25hbWUnKSxcbiAgICBxdWVyeVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLndoaXRlc3BhY2UsXG4gICAgcHJlZmV0Y2g6IHtcbiAgICB1cmw6ICcva2V5d29yZHMnLFxuICAgIGZpbHRlcjogZnVuY3Rpb24obGlzdCkge1xuICAgICAgcmV0dXJuICQubWFwKGxpc3QsIGZ1bmN0aW9uKGNpdHluYW1lKSB7XG4gICAgICAgIHJldHVybiB7IG5hbWU6IGNpdHluYW1lIH07IH0pO1xuICAgIH1cbiAgfVxuXG59KTtcblxua2V5d29yZHMuaW5pdGlhbGl6ZSgpO1xuXG4kKCcjc2VhcmNoJykudHlwZWFoZWFkKG51bGwsIHtcbiAgICAgbWlubGVuZ3RoOiAxLFxuICAgICBuYW1lOiAna2V5d29yZHMnLFxuICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXG4gICAgIHZhbHVlS2V5OiAnbmFtZScsXG4gICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcbn0pO1xuXG4kKCcjc2VhcmNoX3BhZ2UnKS50eXBlYWhlYWQobnVsbCwge1xuICAgICBtaW5sZW5ndGg6IDEsXG4gICAgIG5hbWU6ICdrZXl3b3JkcycsXG4gICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcbiAgICAgdmFsdWVLZXk6ICduYW1lJyxcbiAgICAgc291cmNlOiBrZXl3b3Jkcy50dEFkYXB0ZXIoKVxufSk7XG5cblxuXG4kKCcja2V5d29yZHMnKS50YWdzaW5wdXQoe1xuICAgIGNvbmZpcm1LZXlzOiBbMTMsIDQ0XSxcbiAgICB0eXBlYWhlYWRqczogW3tcbiAgICAgICAgICBtaW5MZW5ndGg6IDEsXG4gICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuXG4gICAgfSx7XG4gICAgICAgIG1pbmxlbmd0aDogMSxcbiAgICAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgICAgZGlzcGxheUtleTogJ25hbWUnLFxuICAgICAgICB2YWx1ZUtleTogJ25hbWUnLFxuICAgICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXG4gICAgfV0sXG4gICAgZnJlZUlucHV0OiB0cnVlLFxuXG59KTtcblxuJCgnI2xvY2F0aW9uX2tleXdvcmRzJykudGFnc2lucHV0KHtcbiAgICBjb25maXJtS2V5czogWzEzLCA0NF0sXG4gICAgdHlwZWFoZWFkanM6IFt7XG4gICAgICAgICAgbWluTGVuZ3RoOiAxLFxuICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcblxuICAgIH0se1xuICAgICAgICBtaW5sZW5ndGg6IDEsXG4gICAgICAgIG5hbWU6ICdrZXl3b3JkcycsXG4gICAgICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcbiAgICAgICAgdmFsdWVLZXk6ICduYW1lJyxcbiAgICAgICAgc291cmNlOiBrZXl3b3Jkcy50dEFkYXB0ZXIoKVxuICAgIH1dLFxuICAgIGZyZWVJbnB1dDogdHJ1ZSxcblxufSk7XG5cbiQoJy5kcmFhaWtub3BqZScpLmNsaWNrKGZ1bmN0aW9uICgpIHtcblx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHQkKCcuZ3JpZCcpLm1hc29ucnkoJ2xheW91dCcpO1xuXHR9LCAxMDApO1xufSk7XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgR2lmZmZlcih7XG4gICAgICBwbGF5QnV0dG9uU3R5bGVzOiB7XG4gICAgICAgICd3aWR0aCc6ICc2MHB4JyxcbiAgICAgICAgJ2hlaWdodCc6ICc2MHB4JyxcbiAgICAgICAgJ2JvcmRlci1yYWRpdXMnOiAnMzBweCcsXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJ3JnYmEoMCwgMCwgMCwgMC4zKScsXG4gICAgICAgICdwb3NpdGlvbic6ICdhYnNvbHV0ZScsXG4gICAgICAgICd0b3AnOiAnNTAlJyxcbiAgICAgICAgJ2xlZnQnOiAnNTAlJyxcbiAgICAgICAgJ21hcmdpbic6ICctMzBweCAwIDAgLTMwcHgnXG4gICAgICB9LFxuICAgICAgcGxheUJ1dHRvbkljb25TdHlsZXM6IHtcbiAgICAgICAgJ3dpZHRoJzogJzAnLFxuICAgICAgICAnaGVpZ2h0JzogJzAnLFxuICAgICAgICAnYm9yZGVyLXRvcCc6ICcxNHB4IHNvbGlkIHRyYW5zcGFyZW50JyxcbiAgICAgICAgJ2JvcmRlci1ib3R0b20nOiAnMTRweCBzb2xpZCB0cmFuc3BhcmVudCcsXG4gICAgICAgICdib3JkZXItbGVmdCc6ICcxNHB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsIDAuNSknLFxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxuICAgICAgICAnbGVmdCc6ICcyNnB4JyxcbiAgICAgICAgJ3RvcCc6ICcxNnB4J1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgJCgnLmdyaWQnKS5tYXNvbnJ5KHtcbiAgICAgIGl0ZW1TZWxlY3RvcjogJy5ncmlkLWl0ZW0nLCAvLyB1c2UgYSBzZXBhcmF0ZSBjbGFzcyBmb3IgaXRlbVNlbGVjdG9yLCBvdGhlciB0aGFuIC5jb2wtXG4gICAgICBjb2x1bW5XaWR0aDogJy5ncmlkLXNpemVyJyxcbiAgICAgIHBlcmNlbnRQb3NpdGlvbjogdHJ1ZVxuICAgIH0pO1xufSIsIi8qIVxuICogTWFzb25yeSBQQUNLQUdFRCB2NC4yLjBcbiAqIENhc2NhZGluZyBncmlkIGxheW91dCBsaWJyYXJ5XG4gKiBodHRwOi8vbWFzb25yeS5kZXNhbmRyby5jb21cbiAqIE1JVCBMaWNlbnNlXG4gKiBieSBEYXZpZCBEZVNhbmRyb1xuICovXG5cbiFmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJqcXVlcnktYnJpZGdldC9qcXVlcnktYnJpZGdldFwiLFtcImpxdWVyeVwiXSxmdW5jdGlvbihpKXtyZXR1cm4gZSh0LGkpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSh0LHJlcXVpcmUoXCJqcXVlcnlcIikpOnQualF1ZXJ5QnJpZGdldD1lKHQsdC5qUXVlcnkpfSh3aW5kb3csZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBpKGkscixhKXtmdW5jdGlvbiBoKHQsZSxuKXt2YXIgbyxyPVwiJCgpLlwiK2krJyhcIicrZSsnXCIpJztyZXR1cm4gdC5lYWNoKGZ1bmN0aW9uKHQsaCl7dmFyIHU9YS5kYXRhKGgsaSk7aWYoIXUpcmV0dXJuIHZvaWQgcyhpK1wiIG5vdCBpbml0aWFsaXplZC4gQ2Fubm90IGNhbGwgbWV0aG9kcywgaS5lLiBcIityKTt2YXIgZD11W2VdO2lmKCFkfHxcIl9cIj09ZS5jaGFyQXQoMCkpcmV0dXJuIHZvaWQgcyhyK1wiIGlzIG5vdCBhIHZhbGlkIG1ldGhvZFwiKTt2YXIgbD1kLmFwcGx5KHUsbik7bz12b2lkIDA9PT1vP2w6b30pLHZvaWQgMCE9PW8/bzp0fWZ1bmN0aW9uIHUodCxlKXt0LmVhY2goZnVuY3Rpb24odCxuKXt2YXIgbz1hLmRhdGEobixpKTtvPyhvLm9wdGlvbihlKSxvLl9pbml0KCkpOihvPW5ldyByKG4sZSksYS5kYXRhKG4saSxvKSl9KX1hPWF8fGV8fHQualF1ZXJ5LGEmJihyLnByb3RvdHlwZS5vcHRpb258fChyLnByb3RvdHlwZS5vcHRpb249ZnVuY3Rpb24odCl7YS5pc1BsYWluT2JqZWN0KHQpJiYodGhpcy5vcHRpb25zPWEuZXh0ZW5kKCEwLHRoaXMub3B0aW9ucyx0KSl9KSxhLmZuW2ldPWZ1bmN0aW9uKHQpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiB0KXt2YXIgZT1vLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiBoKHRoaXMsdCxlKX1yZXR1cm4gdSh0aGlzLHQpLHRoaXN9LG4oYSkpfWZ1bmN0aW9uIG4odCl7IXR8fHQmJnQuYnJpZGdldHx8KHQuYnJpZGdldD1pKX12YXIgbz1BcnJheS5wcm90b3R5cGUuc2xpY2Uscj10LmNvbnNvbGUscz1cInVuZGVmaW5lZFwiPT10eXBlb2Ygcj9mdW5jdGlvbigpe306ZnVuY3Rpb24odCl7ci5lcnJvcih0KX07cmV0dXJuIG4oZXx8dC5qUXVlcnkpLGl9KSxmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKCk6dC5FdkVtaXR0ZXI9ZSgpfShcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P3dpbmRvdzp0aGlzLGZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCgpe312YXIgZT10LnByb3RvdHlwZTtyZXR1cm4gZS5vbj1mdW5jdGlvbih0LGUpe2lmKHQmJmUpe3ZhciBpPXRoaXMuX2V2ZW50cz10aGlzLl9ldmVudHN8fHt9LG49aVt0XT1pW3RdfHxbXTtyZXR1cm4tMT09bi5pbmRleE9mKGUpJiZuLnB1c2goZSksdGhpc319LGUub25jZT1mdW5jdGlvbih0LGUpe2lmKHQmJmUpe3RoaXMub24odCxlKTt2YXIgaT10aGlzLl9vbmNlRXZlbnRzPXRoaXMuX29uY2VFdmVudHN8fHt9LG49aVt0XT1pW3RdfHx7fTtyZXR1cm4gbltlXT0hMCx0aGlzfX0sZS5vZmY9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50c1t0XTtpZihpJiZpLmxlbmd0aCl7dmFyIG49aS5pbmRleE9mKGUpO3JldHVybi0xIT1uJiZpLnNwbGljZShuLDEpLHRoaXN9fSxlLmVtaXRFdmVudD1mdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMuX2V2ZW50cyYmdGhpcy5fZXZlbnRzW3RdO2lmKGkmJmkubGVuZ3RoKXt2YXIgbj0wLG89aVtuXTtlPWV8fFtdO2Zvcih2YXIgcj10aGlzLl9vbmNlRXZlbnRzJiZ0aGlzLl9vbmNlRXZlbnRzW3RdO287KXt2YXIgcz1yJiZyW29dO3MmJih0aGlzLm9mZih0LG8pLGRlbGV0ZSByW29dKSxvLmFwcGx5KHRoaXMsZSksbis9cz8wOjEsbz1pW25dfXJldHVybiB0aGlzfX0sdH0pLGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImdldC1zaXplL2dldC1zaXplXCIsW10sZnVuY3Rpb24oKXtyZXR1cm4gZSgpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSgpOnQuZ2V0U2l6ZT1lKCl9KHdpbmRvdyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCl7dmFyIGU9cGFyc2VGbG9hdCh0KSxpPS0xPT10LmluZGV4T2YoXCIlXCIpJiYhaXNOYU4oZSk7cmV0dXJuIGkmJmV9ZnVuY3Rpb24gZSgpe31mdW5jdGlvbiBpKCl7Zm9yKHZhciB0PXt3aWR0aDowLGhlaWdodDowLGlubmVyV2lkdGg6MCxpbm5lckhlaWdodDowLG91dGVyV2lkdGg6MCxvdXRlckhlaWdodDowfSxlPTA7dT5lO2UrKyl7dmFyIGk9aFtlXTt0W2ldPTB9cmV0dXJuIHR9ZnVuY3Rpb24gbih0KXt2YXIgZT1nZXRDb21wdXRlZFN0eWxlKHQpO3JldHVybiBlfHxhKFwiU3R5bGUgcmV0dXJuZWQgXCIrZStcIi4gQXJlIHlvdSBydW5uaW5nIHRoaXMgY29kZSBpbiBhIGhpZGRlbiBpZnJhbWUgb24gRmlyZWZveD8gU2VlIGh0dHA6Ly9iaXQubHkvZ2V0c2l6ZWJ1ZzFcIiksZX1mdW5jdGlvbiBvKCl7aWYoIWQpe2Q9ITA7dmFyIGU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtlLnN0eWxlLndpZHRoPVwiMjAwcHhcIixlLnN0eWxlLnBhZGRpbmc9XCIxcHggMnB4IDNweCA0cHhcIixlLnN0eWxlLmJvcmRlclN0eWxlPVwic29saWRcIixlLnN0eWxlLmJvcmRlcldpZHRoPVwiMXB4IDJweCAzcHggNHB4XCIsZS5zdHlsZS5ib3hTaXppbmc9XCJib3JkZXItYm94XCI7dmFyIGk9ZG9jdW1lbnQuYm9keXx8ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O2kuYXBwZW5kQ2hpbGQoZSk7dmFyIG89bihlKTtyLmlzQm94U2l6ZU91dGVyPXM9MjAwPT10KG8ud2lkdGgpLGkucmVtb3ZlQ2hpbGQoZSl9fWZ1bmN0aW9uIHIoZSl7aWYobygpLFwic3RyaW5nXCI9PXR5cGVvZiBlJiYoZT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKGUpKSxlJiZcIm9iamVjdFwiPT10eXBlb2YgZSYmZS5ub2RlVHlwZSl7dmFyIHI9bihlKTtpZihcIm5vbmVcIj09ci5kaXNwbGF5KXJldHVybiBpKCk7dmFyIGE9e307YS53aWR0aD1lLm9mZnNldFdpZHRoLGEuaGVpZ2h0PWUub2Zmc2V0SGVpZ2h0O2Zvcih2YXIgZD1hLmlzQm9yZGVyQm94PVwiYm9yZGVyLWJveFwiPT1yLmJveFNpemluZyxsPTA7dT5sO2wrKyl7dmFyIGM9aFtsXSxmPXJbY10sbT1wYXJzZUZsb2F0KGYpO2FbY109aXNOYU4obSk/MDptfXZhciBwPWEucGFkZGluZ0xlZnQrYS5wYWRkaW5nUmlnaHQsZz1hLnBhZGRpbmdUb3ArYS5wYWRkaW5nQm90dG9tLHk9YS5tYXJnaW5MZWZ0K2EubWFyZ2luUmlnaHQsdj1hLm1hcmdpblRvcCthLm1hcmdpbkJvdHRvbSxfPWEuYm9yZGVyTGVmdFdpZHRoK2EuYm9yZGVyUmlnaHRXaWR0aCx6PWEuYm9yZGVyVG9wV2lkdGgrYS5ib3JkZXJCb3R0b21XaWR0aCxFPWQmJnMsYj10KHIud2lkdGgpO2IhPT0hMSYmKGEud2lkdGg9YisoRT8wOnArXykpO3ZhciB4PXQoci5oZWlnaHQpO3JldHVybiB4IT09ITEmJihhLmhlaWdodD14KyhFPzA6Zyt6KSksYS5pbm5lcldpZHRoPWEud2lkdGgtKHArXyksYS5pbm5lckhlaWdodD1hLmhlaWdodC0oZyt6KSxhLm91dGVyV2lkdGg9YS53aWR0aCt5LGEub3V0ZXJIZWlnaHQ9YS5oZWlnaHQrdixhfX12YXIgcyxhPVwidW5kZWZpbmVkXCI9PXR5cGVvZiBjb25zb2xlP2U6ZnVuY3Rpb24odCl7Y29uc29sZS5lcnJvcih0KX0saD1bXCJwYWRkaW5nTGVmdFwiLFwicGFkZGluZ1JpZ2h0XCIsXCJwYWRkaW5nVG9wXCIsXCJwYWRkaW5nQm90dG9tXCIsXCJtYXJnaW5MZWZ0XCIsXCJtYXJnaW5SaWdodFwiLFwibWFyZ2luVG9wXCIsXCJtYXJnaW5Cb3R0b21cIixcImJvcmRlckxlZnRXaWR0aFwiLFwiYm9yZGVyUmlnaHRXaWR0aFwiLFwiYm9yZGVyVG9wV2lkdGhcIixcImJvcmRlckJvdHRvbVdpZHRoXCJdLHU9aC5sZW5ndGgsZD0hMTtyZXR1cm4gcn0pLGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImRlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3IvbWF0Y2hlcy1zZWxlY3RvclwiLGUpOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUoKTp0Lm1hdGNoZXNTZWxlY3Rvcj1lKCl9KHdpbmRvdyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO3ZhciB0PWZ1bmN0aW9uKCl7dmFyIHQ9d2luZG93LkVsZW1lbnQucHJvdG90eXBlO2lmKHQubWF0Y2hlcylyZXR1cm5cIm1hdGNoZXNcIjtpZih0Lm1hdGNoZXNTZWxlY3RvcilyZXR1cm5cIm1hdGNoZXNTZWxlY3RvclwiO2Zvcih2YXIgZT1bXCJ3ZWJraXRcIixcIm1velwiLFwibXNcIixcIm9cIl0saT0wO2k8ZS5sZW5ndGg7aSsrKXt2YXIgbj1lW2ldLG89bitcIk1hdGNoZXNTZWxlY3RvclwiO2lmKHRbb10pcmV0dXJuIG99fSgpO3JldHVybiBmdW5jdGlvbihlLGkpe3JldHVybiBlW3RdKGkpfX0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImZpenp5LXVpLXV0aWxzL3V0aWxzXCIsW1wiZGVzYW5kcm8tbWF0Y2hlcy1zZWxlY3Rvci9tYXRjaGVzLXNlbGVjdG9yXCJdLGZ1bmN0aW9uKGkpe3JldHVybiBlKHQsaSl9KTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHQscmVxdWlyZShcImRlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3JcIikpOnQuZml6enlVSVV0aWxzPWUodCx0Lm1hdGNoZXNTZWxlY3Rvcil9KHdpbmRvdyxmdW5jdGlvbih0LGUpe3ZhciBpPXt9O2kuZXh0ZW5kPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciBpIGluIGUpdFtpXT1lW2ldO3JldHVybiB0fSxpLm1vZHVsbz1mdW5jdGlvbih0LGUpe3JldHVybih0JWUrZSklZX0saS5tYWtlQXJyYXk9ZnVuY3Rpb24odCl7dmFyIGU9W107aWYoQXJyYXkuaXNBcnJheSh0KSllPXQ7ZWxzZSBpZih0JiZcIm9iamVjdFwiPT10eXBlb2YgdCYmXCJudW1iZXJcIj09dHlwZW9mIHQubGVuZ3RoKWZvcih2YXIgaT0wO2k8dC5sZW5ndGg7aSsrKWUucHVzaCh0W2ldKTtlbHNlIGUucHVzaCh0KTtyZXR1cm4gZX0saS5yZW1vdmVGcm9tPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dC5pbmRleE9mKGUpOy0xIT1pJiZ0LnNwbGljZShpLDEpfSxpLmdldFBhcmVudD1mdW5jdGlvbih0LGkpe2Zvcig7dCE9ZG9jdW1lbnQuYm9keTspaWYodD10LnBhcmVudE5vZGUsZSh0LGkpKXJldHVybiB0fSxpLmdldFF1ZXJ5RWxlbWVudD1mdW5jdGlvbih0KXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgdD9kb2N1bWVudC5xdWVyeVNlbGVjdG9yKHQpOnR9LGkuaGFuZGxlRXZlbnQ9ZnVuY3Rpb24odCl7dmFyIGU9XCJvblwiK3QudHlwZTt0aGlzW2VdJiZ0aGlzW2VdKHQpfSxpLmZpbHRlckZpbmRFbGVtZW50cz1mdW5jdGlvbih0LG4pe3Q9aS5tYWtlQXJyYXkodCk7dmFyIG89W107cmV0dXJuIHQuZm9yRWFjaChmdW5jdGlvbih0KXtpZih0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpe2lmKCFuKXJldHVybiB2b2lkIG8ucHVzaCh0KTtlKHQsbikmJm8ucHVzaCh0KTtmb3IodmFyIGk9dC5xdWVyeVNlbGVjdG9yQWxsKG4pLHI9MDtyPGkubGVuZ3RoO3IrKylvLnB1c2goaVtyXSl9fSksb30saS5kZWJvdW5jZU1ldGhvZD1mdW5jdGlvbih0LGUsaSl7dmFyIG49dC5wcm90b3R5cGVbZV0sbz1lK1wiVGltZW91dFwiO3QucHJvdG90eXBlW2VdPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpc1tvXTt0JiZjbGVhclRpbWVvdXQodCk7dmFyIGU9YXJndW1lbnRzLHI9dGhpczt0aGlzW29dPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtuLmFwcGx5KHIsZSksZGVsZXRlIHJbb119LGl8fDEwMCl9fSxpLmRvY1JlYWR5PWZ1bmN0aW9uKHQpe3ZhciBlPWRvY3VtZW50LnJlYWR5U3RhdGU7XCJjb21wbGV0ZVwiPT1lfHxcImludGVyYWN0aXZlXCI9PWU/c2V0VGltZW91dCh0KTpkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLHQpfSxpLnRvRGFzaGVkPWZ1bmN0aW9uKHQpe3JldHVybiB0LnJlcGxhY2UoLyguKShbQS1aXSkvZyxmdW5jdGlvbih0LGUsaSl7cmV0dXJuIGUrXCItXCIraX0pLnRvTG93ZXJDYXNlKCl9O3ZhciBuPXQuY29uc29sZTtyZXR1cm4gaS5odG1sSW5pdD1mdW5jdGlvbihlLG8pe2kuZG9jUmVhZHkoZnVuY3Rpb24oKXt2YXIgcj1pLnRvRGFzaGVkKG8pLHM9XCJkYXRhLVwiK3IsYT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW1wiK3MrXCJdXCIpLGg9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5qcy1cIityKSx1PWkubWFrZUFycmF5KGEpLmNvbmNhdChpLm1ha2VBcnJheShoKSksZD1zK1wiLW9wdGlvbnNcIixsPXQualF1ZXJ5O3UuZm9yRWFjaChmdW5jdGlvbih0KXt2YXIgaSxyPXQuZ2V0QXR0cmlidXRlKHMpfHx0LmdldEF0dHJpYnV0ZShkKTt0cnl7aT1yJiZKU09OLnBhcnNlKHIpfWNhdGNoKGEpe3JldHVybiB2b2lkKG4mJm4uZXJyb3IoXCJFcnJvciBwYXJzaW5nIFwiK3MrXCIgb24gXCIrdC5jbGFzc05hbWUrXCI6IFwiK2EpKX12YXIgaD1uZXcgZSh0LGkpO2wmJmwuZGF0YSh0LG8saCl9KX0pfSxpfSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwib3V0bGF5ZXIvaXRlbVwiLFtcImV2LWVtaXR0ZXIvZXYtZW1pdHRlclwiLFwiZ2V0LXNpemUvZ2V0LXNpemVcIl0sZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZShyZXF1aXJlKFwiZXYtZW1pdHRlclwiKSxyZXF1aXJlKFwiZ2V0LXNpemVcIikpOih0Lk91dGxheWVyPXt9LHQuT3V0bGF5ZXIuSXRlbT1lKHQuRXZFbWl0dGVyLHQuZ2V0U2l6ZSkpfSh3aW5kb3csZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBpKHQpe2Zvcih2YXIgZSBpbiB0KXJldHVybiExO3JldHVybiBlPW51bGwsITB9ZnVuY3Rpb24gbih0LGUpe3QmJih0aGlzLmVsZW1lbnQ9dCx0aGlzLmxheW91dD1lLHRoaXMucG9zaXRpb249e3g6MCx5OjB9LHRoaXMuX2NyZWF0ZSgpKX1mdW5jdGlvbiBvKHQpe3JldHVybiB0LnJlcGxhY2UoLyhbQS1aXSkvZyxmdW5jdGlvbih0KXtyZXR1cm5cIi1cIit0LnRvTG93ZXJDYXNlKCl9KX12YXIgcj1kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUscz1cInN0cmluZ1wiPT10eXBlb2Ygci50cmFuc2l0aW9uP1widHJhbnNpdGlvblwiOlwiV2Via2l0VHJhbnNpdGlvblwiLGE9XCJzdHJpbmdcIj09dHlwZW9mIHIudHJhbnNmb3JtP1widHJhbnNmb3JtXCI6XCJXZWJraXRUcmFuc2Zvcm1cIixoPXtXZWJraXRUcmFuc2l0aW9uOlwid2Via2l0VHJhbnNpdGlvbkVuZFwiLHRyYW5zaXRpb246XCJ0cmFuc2l0aW9uZW5kXCJ9W3NdLHU9e3RyYW5zZm9ybTphLHRyYW5zaXRpb246cyx0cmFuc2l0aW9uRHVyYXRpb246cytcIkR1cmF0aW9uXCIsdHJhbnNpdGlvblByb3BlcnR5OnMrXCJQcm9wZXJ0eVwiLHRyYW5zaXRpb25EZWxheTpzK1wiRGVsYXlcIn0sZD1uLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHQucHJvdG90eXBlKTtkLmNvbnN0cnVjdG9yPW4sZC5fY3JlYXRlPWZ1bmN0aW9uKCl7dGhpcy5fdHJhbnNuPXtpbmdQcm9wZXJ0aWVzOnt9LGNsZWFuOnt9LG9uRW5kOnt9fSx0aGlzLmNzcyh7cG9zaXRpb246XCJhYnNvbHV0ZVwifSl9LGQuaGFuZGxlRXZlbnQ9ZnVuY3Rpb24odCl7dmFyIGU9XCJvblwiK3QudHlwZTt0aGlzW2VdJiZ0aGlzW2VdKHQpfSxkLmdldFNpemU9ZnVuY3Rpb24oKXt0aGlzLnNpemU9ZSh0aGlzLmVsZW1lbnQpfSxkLmNzcz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmVsZW1lbnQuc3R5bGU7Zm9yKHZhciBpIGluIHQpe3ZhciBuPXVbaV18fGk7ZVtuXT10W2ldfX0sZC5nZXRQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciB0PWdldENvbXB1dGVkU3R5bGUodGhpcy5lbGVtZW50KSxlPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5MZWZ0XCIpLGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpblRvcFwiKSxuPXRbZT9cImxlZnRcIjpcInJpZ2h0XCJdLG89dFtpP1widG9wXCI6XCJib3R0b21cIl0scj10aGlzLmxheW91dC5zaXplLHM9LTEhPW4uaW5kZXhPZihcIiVcIik/cGFyc2VGbG9hdChuKS8xMDAqci53aWR0aDpwYXJzZUludChuLDEwKSxhPS0xIT1vLmluZGV4T2YoXCIlXCIpP3BhcnNlRmxvYXQobykvMTAwKnIuaGVpZ2h0OnBhcnNlSW50KG8sMTApO3M9aXNOYU4ocyk/MDpzLGE9aXNOYU4oYSk/MDphLHMtPWU/ci5wYWRkaW5nTGVmdDpyLnBhZGRpbmdSaWdodCxhLT1pP3IucGFkZGluZ1RvcDpyLnBhZGRpbmdCb3R0b20sdGhpcy5wb3NpdGlvbi54PXMsdGhpcy5wb3NpdGlvbi55PWF9LGQubGF5b3V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmxheW91dC5zaXplLGU9e30saT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxuPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIiksbz1pP1wicGFkZGluZ0xlZnRcIjpcInBhZGRpbmdSaWdodFwiLHI9aT9cImxlZnRcIjpcInJpZ2h0XCIscz1pP1wicmlnaHRcIjpcImxlZnRcIixhPXRoaXMucG9zaXRpb24ueCt0W29dO2Vbcl09dGhpcy5nZXRYVmFsdWUoYSksZVtzXT1cIlwiO3ZhciBoPW4/XCJwYWRkaW5nVG9wXCI6XCJwYWRkaW5nQm90dG9tXCIsdT1uP1widG9wXCI6XCJib3R0b21cIixkPW4/XCJib3R0b21cIjpcInRvcFwiLGw9dGhpcy5wb3NpdGlvbi55K3RbaF07ZVt1XT10aGlzLmdldFlWYWx1ZShsKSxlW2RdPVwiXCIsdGhpcy5jc3MoZSksdGhpcy5lbWl0RXZlbnQoXCJsYXlvdXRcIixbdGhpc10pfSxkLmdldFhWYWx1ZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwiaG9yaXpvbnRhbFwiKTtyZXR1cm4gdGhpcy5sYXlvdXQub3B0aW9ucy5wZXJjZW50UG9zaXRpb24mJiFlP3QvdGhpcy5sYXlvdXQuc2l6ZS53aWR0aCoxMDArXCIlXCI6dCtcInB4XCJ9LGQuZ2V0WVZhbHVlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJob3Jpem9udGFsXCIpO3JldHVybiB0aGlzLmxheW91dC5vcHRpb25zLnBlcmNlbnRQb3NpdGlvbiYmZT90L3RoaXMubGF5b3V0LnNpemUuaGVpZ2h0KjEwMCtcIiVcIjp0K1wicHhcIn0sZC5fdHJhbnNpdGlvblRvPWZ1bmN0aW9uKHQsZSl7dGhpcy5nZXRQb3NpdGlvbigpO3ZhciBpPXRoaXMucG9zaXRpb24ueCxuPXRoaXMucG9zaXRpb24ueSxvPXBhcnNlSW50KHQsMTApLHI9cGFyc2VJbnQoZSwxMCkscz1vPT09dGhpcy5wb3NpdGlvbi54JiZyPT09dGhpcy5wb3NpdGlvbi55O2lmKHRoaXMuc2V0UG9zaXRpb24odCxlKSxzJiYhdGhpcy5pc1RyYW5zaXRpb25pbmcpcmV0dXJuIHZvaWQgdGhpcy5sYXlvdXRQb3NpdGlvbigpO3ZhciBhPXQtaSxoPWUtbix1PXt9O3UudHJhbnNmb3JtPXRoaXMuZ2V0VHJhbnNsYXRlKGEsaCksdGhpcy50cmFuc2l0aW9uKHt0bzp1LG9uVHJhbnNpdGlvbkVuZDp7dHJhbnNmb3JtOnRoaXMubGF5b3V0UG9zaXRpb259LGlzQ2xlYW5pbmc6ITB9KX0sZC5nZXRUcmFuc2xhdGU9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxuPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIik7cmV0dXJuIHQ9aT90Oi10LGU9bj9lOi1lLFwidHJhbnNsYXRlM2QoXCIrdCtcInB4LCBcIitlK1wicHgsIDApXCJ9LGQuZ29Ubz1mdW5jdGlvbih0LGUpe3RoaXMuc2V0UG9zaXRpb24odCxlKSx0aGlzLmxheW91dFBvc2l0aW9uKCl9LGQubW92ZVRvPWQuX3RyYW5zaXRpb25UbyxkLnNldFBvc2l0aW9uPWZ1bmN0aW9uKHQsZSl7dGhpcy5wb3NpdGlvbi54PXBhcnNlSW50KHQsMTApLHRoaXMucG9zaXRpb24ueT1wYXJzZUludChlLDEwKX0sZC5fbm9uVHJhbnNpdGlvbj1mdW5jdGlvbih0KXt0aGlzLmNzcyh0LnRvKSx0LmlzQ2xlYW5pbmcmJnRoaXMuX3JlbW92ZVN0eWxlcyh0LnRvKTtmb3IodmFyIGUgaW4gdC5vblRyYW5zaXRpb25FbmQpdC5vblRyYW5zaXRpb25FbmRbZV0uY2FsbCh0aGlzKX0sZC50cmFuc2l0aW9uPWZ1bmN0aW9uKHQpe2lmKCFwYXJzZUZsb2F0KHRoaXMubGF5b3V0Lm9wdGlvbnMudHJhbnNpdGlvbkR1cmF0aW9uKSlyZXR1cm4gdm9pZCB0aGlzLl9ub25UcmFuc2l0aW9uKHQpO3ZhciBlPXRoaXMuX3RyYW5zbjtmb3IodmFyIGkgaW4gdC5vblRyYW5zaXRpb25FbmQpZS5vbkVuZFtpXT10Lm9uVHJhbnNpdGlvbkVuZFtpXTtmb3IoaSBpbiB0LnRvKWUuaW5nUHJvcGVydGllc1tpXT0hMCx0LmlzQ2xlYW5pbmcmJihlLmNsZWFuW2ldPSEwKTtpZih0LmZyb20pe3RoaXMuY3NzKHQuZnJvbSk7dmFyIG49dGhpcy5lbGVtZW50Lm9mZnNldEhlaWdodDtuPW51bGx9dGhpcy5lbmFibGVUcmFuc2l0aW9uKHQudG8pLHRoaXMuY3NzKHQudG8pLHRoaXMuaXNUcmFuc2l0aW9uaW5nPSEwfTt2YXIgbD1cIm9wYWNpdHksXCIrbyhhKTtkLmVuYWJsZVRyYW5zaXRpb249ZnVuY3Rpb24oKXtpZighdGhpcy5pc1RyYW5zaXRpb25pbmcpe3ZhciB0PXRoaXMubGF5b3V0Lm9wdGlvbnMudHJhbnNpdGlvbkR1cmF0aW9uO3Q9XCJudW1iZXJcIj09dHlwZW9mIHQ/dCtcIm1zXCI6dCx0aGlzLmNzcyh7dHJhbnNpdGlvblByb3BlcnR5OmwsdHJhbnNpdGlvbkR1cmF0aW9uOnQsdHJhbnNpdGlvbkRlbGF5OnRoaXMuc3RhZ2dlckRlbGF5fHwwfSksdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoaCx0aGlzLCExKX19LGQub253ZWJraXRUcmFuc2l0aW9uRW5kPWZ1bmN0aW9uKHQpe3RoaXMub250cmFuc2l0aW9uZW5kKHQpfSxkLm9ub3RyYW5zaXRpb25lbmQ9ZnVuY3Rpb24odCl7dGhpcy5vbnRyYW5zaXRpb25lbmQodCl9O3ZhciBjPXtcIi13ZWJraXQtdHJhbnNmb3JtXCI6XCJ0cmFuc2Zvcm1cIn07ZC5vbnRyYW5zaXRpb25lbmQ9ZnVuY3Rpb24odCl7aWYodC50YXJnZXQ9PT10aGlzLmVsZW1lbnQpe3ZhciBlPXRoaXMuX3RyYW5zbixuPWNbdC5wcm9wZXJ0eU5hbWVdfHx0LnByb3BlcnR5TmFtZTtpZihkZWxldGUgZS5pbmdQcm9wZXJ0aWVzW25dLGkoZS5pbmdQcm9wZXJ0aWVzKSYmdGhpcy5kaXNhYmxlVHJhbnNpdGlvbigpLG4gaW4gZS5jbGVhbiYmKHRoaXMuZWxlbWVudC5zdHlsZVt0LnByb3BlcnR5TmFtZV09XCJcIixkZWxldGUgZS5jbGVhbltuXSksbiBpbiBlLm9uRW5kKXt2YXIgbz1lLm9uRW5kW25dO28uY2FsbCh0aGlzKSxkZWxldGUgZS5vbkVuZFtuXX10aGlzLmVtaXRFdmVudChcInRyYW5zaXRpb25FbmRcIixbdGhpc10pfX0sZC5kaXNhYmxlVHJhbnNpdGlvbj1mdW5jdGlvbigpe3RoaXMucmVtb3ZlVHJhbnNpdGlvblN0eWxlcygpLHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGgsdGhpcywhMSksdGhpcy5pc1RyYW5zaXRpb25pbmc9ITF9LGQuX3JlbW92ZVN0eWxlcz1mdW5jdGlvbih0KXt2YXIgZT17fTtmb3IodmFyIGkgaW4gdCllW2ldPVwiXCI7dGhpcy5jc3MoZSl9O3ZhciBmPXt0cmFuc2l0aW9uUHJvcGVydHk6XCJcIix0cmFuc2l0aW9uRHVyYXRpb246XCJcIix0cmFuc2l0aW9uRGVsYXk6XCJcIn07cmV0dXJuIGQucmVtb3ZlVHJhbnNpdGlvblN0eWxlcz1mdW5jdGlvbigpe3RoaXMuY3NzKGYpfSxkLnN0YWdnZXI9ZnVuY3Rpb24odCl7dD1pc05hTih0KT8wOnQsdGhpcy5zdGFnZ2VyRGVsYXk9dCtcIm1zXCJ9LGQucmVtb3ZlRWxlbT1mdW5jdGlvbigpe3RoaXMuZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCksdGhpcy5jc3Moe2Rpc3BsYXk6XCJcIn0pLHRoaXMuZW1pdEV2ZW50KFwicmVtb3ZlXCIsW3RoaXNdKX0sZC5yZW1vdmU9ZnVuY3Rpb24oKXtyZXR1cm4gcyYmcGFyc2VGbG9hdCh0aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbik/KHRoaXMub25jZShcInRyYW5zaXRpb25FbmRcIixmdW5jdGlvbigpe3RoaXMucmVtb3ZlRWxlbSgpfSksdm9pZCB0aGlzLmhpZGUoKSk6dm9pZCB0aGlzLnJlbW92ZUVsZW0oKX0sZC5yZXZlYWw9ZnVuY3Rpb24oKXtkZWxldGUgdGhpcy5pc0hpZGRlbix0aGlzLmNzcyh7ZGlzcGxheTpcIlwifSk7dmFyIHQ9dGhpcy5sYXlvdXQub3B0aW9ucyxlPXt9LGk9dGhpcy5nZXRIaWRlUmV2ZWFsVHJhbnNpdGlvbkVuZFByb3BlcnR5KFwidmlzaWJsZVN0eWxlXCIpO2VbaV09dGhpcy5vblJldmVhbFRyYW5zaXRpb25FbmQsdGhpcy50cmFuc2l0aW9uKHtmcm9tOnQuaGlkZGVuU3R5bGUsdG86dC52aXNpYmxlU3R5bGUsaXNDbGVhbmluZzohMCxvblRyYW5zaXRpb25FbmQ6ZX0pfSxkLm9uUmV2ZWFsVHJhbnNpdGlvbkVuZD1mdW5jdGlvbigpe3RoaXMuaXNIaWRkZW58fHRoaXMuZW1pdEV2ZW50KFwicmV2ZWFsXCIpfSxkLmdldEhpZGVSZXZlYWxUcmFuc2l0aW9uRW5kUHJvcGVydHk9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5sYXlvdXQub3B0aW9uc1t0XTtpZihlLm9wYWNpdHkpcmV0dXJuXCJvcGFjaXR5XCI7Zm9yKHZhciBpIGluIGUpcmV0dXJuIGl9LGQuaGlkZT1mdW5jdGlvbigpe3RoaXMuaXNIaWRkZW49ITAsdGhpcy5jc3Moe2Rpc3BsYXk6XCJcIn0pO3ZhciB0PXRoaXMubGF5b3V0Lm9wdGlvbnMsZT17fSxpPXRoaXMuZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eShcImhpZGRlblN0eWxlXCIpO2VbaV09dGhpcy5vbkhpZGVUcmFuc2l0aW9uRW5kLHRoaXMudHJhbnNpdGlvbih7ZnJvbTp0LnZpc2libGVTdHlsZSx0bzp0LmhpZGRlblN0eWxlLGlzQ2xlYW5pbmc6ITAsb25UcmFuc2l0aW9uRW5kOmV9KX0sZC5vbkhpZGVUcmFuc2l0aW9uRW5kPWZ1bmN0aW9uKCl7dGhpcy5pc0hpZGRlbiYmKHRoaXMuY3NzKHtkaXNwbGF5Olwibm9uZVwifSksdGhpcy5lbWl0RXZlbnQoXCJoaWRlXCIpKX0sZC5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5jc3Moe3Bvc2l0aW9uOlwiXCIsbGVmdDpcIlwiLHJpZ2h0OlwiXCIsdG9wOlwiXCIsYm90dG9tOlwiXCIsdHJhbnNpdGlvbjpcIlwiLHRyYW5zZm9ybTpcIlwifSl9LG59KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJvdXRsYXllci9vdXRsYXllclwiLFtcImV2LWVtaXR0ZXIvZXYtZW1pdHRlclwiLFwiZ2V0LXNpemUvZ2V0LXNpemVcIixcImZpenp5LXVpLXV0aWxzL3V0aWxzXCIsXCIuL2l0ZW1cIl0sZnVuY3Rpb24oaSxuLG8scil7cmV0dXJuIGUodCxpLG4sbyxyKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUodCxyZXF1aXJlKFwiZXYtZW1pdHRlclwiKSxyZXF1aXJlKFwiZ2V0LXNpemVcIikscmVxdWlyZShcImZpenp5LXVpLXV0aWxzXCIpLHJlcXVpcmUoXCIuL2l0ZW1cIikpOnQuT3V0bGF5ZXI9ZSh0LHQuRXZFbWl0dGVyLHQuZ2V0U2l6ZSx0LmZpenp5VUlVdGlscyx0Lk91dGxheWVyLkl0ZW0pfSh3aW5kb3csZnVuY3Rpb24odCxlLGksbixvKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiByKHQsZSl7dmFyIGk9bi5nZXRRdWVyeUVsZW1lbnQodCk7aWYoIWkpcmV0dXJuIHZvaWQoaCYmaC5lcnJvcihcIkJhZCBlbGVtZW50IGZvciBcIit0aGlzLmNvbnN0cnVjdG9yLm5hbWVzcGFjZStcIjogXCIrKGl8fHQpKSk7dGhpcy5lbGVtZW50PWksdSYmKHRoaXMuJGVsZW1lbnQ9dSh0aGlzLmVsZW1lbnQpKSx0aGlzLm9wdGlvbnM9bi5leHRlbmQoe30sdGhpcy5jb25zdHJ1Y3Rvci5kZWZhdWx0cyksdGhpcy5vcHRpb24oZSk7dmFyIG89KytsO3RoaXMuZWxlbWVudC5vdXRsYXllckdVSUQ9byxjW29dPXRoaXMsdGhpcy5fY3JlYXRlKCk7dmFyIHI9dGhpcy5fZ2V0T3B0aW9uKFwiaW5pdExheW91dFwiKTtyJiZ0aGlzLmxheW91dCgpfWZ1bmN0aW9uIHModCl7ZnVuY3Rpb24gZSgpe3QuYXBwbHkodGhpcyxhcmd1bWVudHMpfXJldHVybiBlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHQucHJvdG90eXBlKSxlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1lLGV9ZnVuY3Rpb24gYSh0KXtpZihcIm51bWJlclwiPT10eXBlb2YgdClyZXR1cm4gdDt2YXIgZT10Lm1hdGNoKC8oXlxcZCpcXC4/XFxkKikoXFx3KikvKSxpPWUmJmVbMV0sbj1lJiZlWzJdO2lmKCFpLmxlbmd0aClyZXR1cm4gMDtpPXBhcnNlRmxvYXQoaSk7dmFyIG89bVtuXXx8MTtyZXR1cm4gaSpvfXZhciBoPXQuY29uc29sZSx1PXQualF1ZXJ5LGQ9ZnVuY3Rpb24oKXt9LGw9MCxjPXt9O3IubmFtZXNwYWNlPVwib3V0bGF5ZXJcIixyLkl0ZW09byxyLmRlZmF1bHRzPXtjb250YWluZXJTdHlsZTp7cG9zaXRpb246XCJyZWxhdGl2ZVwifSxpbml0TGF5b3V0OiEwLG9yaWdpbkxlZnQ6ITAsb3JpZ2luVG9wOiEwLHJlc2l6ZTohMCxyZXNpemVDb250YWluZXI6ITAsdHJhbnNpdGlvbkR1cmF0aW9uOlwiMC40c1wiLGhpZGRlblN0eWxlOntvcGFjaXR5OjAsdHJhbnNmb3JtOlwic2NhbGUoMC4wMDEpXCJ9LHZpc2libGVTdHlsZTp7b3BhY2l0eToxLHRyYW5zZm9ybTpcInNjYWxlKDEpXCJ9fTt2YXIgZj1yLnByb3RvdHlwZTtuLmV4dGVuZChmLGUucHJvdG90eXBlKSxmLm9wdGlvbj1mdW5jdGlvbih0KXtuLmV4dGVuZCh0aGlzLm9wdGlvbnMsdCl9LGYuX2dldE9wdGlvbj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmNvbnN0cnVjdG9yLmNvbXBhdE9wdGlvbnNbdF07cmV0dXJuIGUmJnZvaWQgMCE9PXRoaXMub3B0aW9uc1tlXT90aGlzLm9wdGlvbnNbZV06dGhpcy5vcHRpb25zW3RdfSxyLmNvbXBhdE9wdGlvbnM9e2luaXRMYXlvdXQ6XCJpc0luaXRMYXlvdXRcIixob3Jpem9udGFsOlwiaXNIb3Jpem9udGFsXCIsbGF5b3V0SW5zdGFudDpcImlzTGF5b3V0SW5zdGFudFwiLG9yaWdpbkxlZnQ6XCJpc09yaWdpbkxlZnRcIixvcmlnaW5Ub3A6XCJpc09yaWdpblRvcFwiLHJlc2l6ZTpcImlzUmVzaXplQm91bmRcIixyZXNpemVDb250YWluZXI6XCJpc1Jlc2l6aW5nQ29udGFpbmVyXCJ9LGYuX2NyZWF0ZT1mdW5jdGlvbigpe3RoaXMucmVsb2FkSXRlbXMoKSx0aGlzLnN0YW1wcz1bXSx0aGlzLnN0YW1wKHRoaXMub3B0aW9ucy5zdGFtcCksbi5leHRlbmQodGhpcy5lbGVtZW50LnN0eWxlLHRoaXMub3B0aW9ucy5jb250YWluZXJTdHlsZSk7dmFyIHQ9dGhpcy5fZ2V0T3B0aW9uKFwicmVzaXplXCIpO3QmJnRoaXMuYmluZFJlc2l6ZSgpfSxmLnJlbG9hZEl0ZW1zPWZ1bmN0aW9uKCl7dGhpcy5pdGVtcz10aGlzLl9pdGVtaXplKHRoaXMuZWxlbWVudC5jaGlsZHJlbil9LGYuX2l0ZW1pemU9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPXRoaXMuX2ZpbHRlckZpbmRJdGVtRWxlbWVudHModCksaT10aGlzLmNvbnN0cnVjdG9yLkl0ZW0sbj1bXSxvPTA7bzxlLmxlbmd0aDtvKyspe3ZhciByPWVbb10scz1uZXcgaShyLHRoaXMpO24ucHVzaChzKX1yZXR1cm4gbn0sZi5fZmlsdGVyRmluZEl0ZW1FbGVtZW50cz1mdW5jdGlvbih0KXtyZXR1cm4gbi5maWx0ZXJGaW5kRWxlbWVudHModCx0aGlzLm9wdGlvbnMuaXRlbVNlbGVjdG9yKX0sZi5nZXRJdGVtRWxlbWVudHM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pdGVtcy5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQuZWxlbWVudH0pfSxmLmxheW91dD1mdW5jdGlvbigpe3RoaXMuX3Jlc2V0TGF5b3V0KCksdGhpcy5fbWFuYWdlU3RhbXBzKCk7dmFyIHQ9dGhpcy5fZ2V0T3B0aW9uKFwibGF5b3V0SW5zdGFudFwiKSxlPXZvaWQgMCE9PXQ/dDohdGhpcy5faXNMYXlvdXRJbml0ZWQ7dGhpcy5sYXlvdXRJdGVtcyh0aGlzLml0ZW1zLGUpLHRoaXMuX2lzTGF5b3V0SW5pdGVkPSEwfSxmLl9pbml0PWYubGF5b3V0LGYuX3Jlc2V0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5nZXRTaXplKCl9LGYuZ2V0U2l6ZT1mdW5jdGlvbigpe3RoaXMuc2l6ZT1pKHRoaXMuZWxlbWVudCl9LGYuX2dldE1lYXN1cmVtZW50PWZ1bmN0aW9uKHQsZSl7dmFyIG4sbz10aGlzLm9wdGlvbnNbdF07bz8oXCJzdHJpbmdcIj09dHlwZW9mIG8/bj10aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcihvKTpvIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQmJihuPW8pLHRoaXNbdF09bj9pKG4pW2VdOm8pOnRoaXNbdF09MH0sZi5sYXlvdXRJdGVtcz1mdW5jdGlvbih0LGUpe3Q9dGhpcy5fZ2V0SXRlbXNGb3JMYXlvdXQodCksdGhpcy5fbGF5b3V0SXRlbXModCxlKSx0aGlzLl9wb3N0TGF5b3V0KCl9LGYuX2dldEl0ZW1zRm9yTGF5b3V0PWZ1bmN0aW9uKHQpe3JldHVybiB0LmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm4hdC5pc0lnbm9yZWR9KX0sZi5fbGF5b3V0SXRlbXM9ZnVuY3Rpb24odCxlKXtpZih0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwibGF5b3V0XCIsdCksdCYmdC5sZW5ndGgpe3ZhciBpPVtdO3QuZm9yRWFjaChmdW5jdGlvbih0KXt2YXIgbj10aGlzLl9nZXRJdGVtTGF5b3V0UG9zaXRpb24odCk7bi5pdGVtPXQsbi5pc0luc3RhbnQ9ZXx8dC5pc0xheW91dEluc3RhbnQsaS5wdXNoKG4pfSx0aGlzKSx0aGlzLl9wcm9jZXNzTGF5b3V0UXVldWUoaSl9fSxmLl9nZXRJdGVtTGF5b3V0UG9zaXRpb249ZnVuY3Rpb24oKXtyZXR1cm57eDowLHk6MH19LGYuX3Byb2Nlc3NMYXlvdXRRdWV1ZT1mdW5jdGlvbih0KXt0aGlzLnVwZGF0ZVN0YWdnZXIoKSx0LmZvckVhY2goZnVuY3Rpb24odCxlKXt0aGlzLl9wb3NpdGlvbkl0ZW0odC5pdGVtLHQueCx0LnksdC5pc0luc3RhbnQsZSl9LHRoaXMpfSxmLnVwZGF0ZVN0YWdnZXI9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLm9wdGlvbnMuc3RhZ2dlcjtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/dm9pZCh0aGlzLnN0YWdnZXI9MCk6KHRoaXMuc3RhZ2dlcj1hKHQpLHRoaXMuc3RhZ2dlcil9LGYuX3Bvc2l0aW9uSXRlbT1mdW5jdGlvbih0LGUsaSxuLG8pe24/dC5nb1RvKGUsaSk6KHQuc3RhZ2dlcihvKnRoaXMuc3RhZ2dlciksdC5tb3ZlVG8oZSxpKSl9LGYuX3Bvc3RMYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLnJlc2l6ZUNvbnRhaW5lcigpfSxmLnJlc2l6ZUNvbnRhaW5lcj1mdW5jdGlvbigpe3ZhciB0PXRoaXMuX2dldE9wdGlvbihcInJlc2l6ZUNvbnRhaW5lclwiKTtpZih0KXt2YXIgZT10aGlzLl9nZXRDb250YWluZXJTaXplKCk7ZSYmKHRoaXMuX3NldENvbnRhaW5lck1lYXN1cmUoZS53aWR0aCwhMCksdGhpcy5fc2V0Q29udGFpbmVyTWVhc3VyZShlLmhlaWdodCwhMSkpfX0sZi5fZ2V0Q29udGFpbmVyU2l6ZT1kLGYuX3NldENvbnRhaW5lck1lYXN1cmU9ZnVuY3Rpb24odCxlKXtpZih2b2lkIDAhPT10KXt2YXIgaT10aGlzLnNpemU7aS5pc0JvcmRlckJveCYmKHQrPWU/aS5wYWRkaW5nTGVmdCtpLnBhZGRpbmdSaWdodCtpLmJvcmRlckxlZnRXaWR0aCtpLmJvcmRlclJpZ2h0V2lkdGg6aS5wYWRkaW5nQm90dG9tK2kucGFkZGluZ1RvcCtpLmJvcmRlclRvcFdpZHRoK2kuYm9yZGVyQm90dG9tV2lkdGgpLHQ9TWF0aC5tYXgodCwwKSx0aGlzLmVsZW1lbnQuc3R5bGVbZT9cIndpZHRoXCI6XCJoZWlnaHRcIl09dCtcInB4XCJ9fSxmLl9lbWl0Q29tcGxldGVPbkl0ZW1zPWZ1bmN0aW9uKHQsZSl7ZnVuY3Rpb24gaSgpe28uZGlzcGF0Y2hFdmVudCh0K1wiQ29tcGxldGVcIixudWxsLFtlXSl9ZnVuY3Rpb24gbigpe3MrKyxzPT1yJiZpKCl9dmFyIG89dGhpcyxyPWUubGVuZ3RoO2lmKCFlfHwhcilyZXR1cm4gdm9pZCBpKCk7dmFyIHM9MDtlLmZvckVhY2goZnVuY3Rpb24oZSl7ZS5vbmNlKHQsbil9KX0sZi5kaXNwYXRjaEV2ZW50PWZ1bmN0aW9uKHQsZSxpKXt2YXIgbj1lP1tlXS5jb25jYXQoaSk6aTtpZih0aGlzLmVtaXRFdmVudCh0LG4pLHUpaWYodGhpcy4kZWxlbWVudD10aGlzLiRlbGVtZW50fHx1KHRoaXMuZWxlbWVudCksZSl7dmFyIG89dS5FdmVudChlKTtvLnR5cGU9dCx0aGlzLiRlbGVtZW50LnRyaWdnZXIobyxpKX1lbHNlIHRoaXMuJGVsZW1lbnQudHJpZ2dlcih0LGkpfSxmLmlnbm9yZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW0odCk7ZSYmKGUuaXNJZ25vcmVkPSEwKX0sZi51bmlnbm9yZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW0odCk7ZSYmZGVsZXRlIGUuaXNJZ25vcmVkfSxmLnN0YW1wPWZ1bmN0aW9uKHQpe3Q9dGhpcy5fZmluZCh0KSx0JiYodGhpcy5zdGFtcHM9dGhpcy5zdGFtcHMuY29uY2F0KHQpLHQuZm9yRWFjaCh0aGlzLmlnbm9yZSx0aGlzKSl9LGYudW5zdGFtcD1mdW5jdGlvbih0KXt0PXRoaXMuX2ZpbmQodCksdCYmdC5mb3JFYWNoKGZ1bmN0aW9uKHQpe24ucmVtb3ZlRnJvbSh0aGlzLnN0YW1wcyx0KSx0aGlzLnVuaWdub3JlKHQpfSx0aGlzKX0sZi5fZmluZD1mdW5jdGlvbih0KXtyZXR1cm4gdD8oXCJzdHJpbmdcIj09dHlwZW9mIHQmJih0PXRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKHQpKSx0PW4ubWFrZUFycmF5KHQpKTp2b2lkIDB9LGYuX21hbmFnZVN0YW1wcz1mdW5jdGlvbigpe3RoaXMuc3RhbXBzJiZ0aGlzLnN0YW1wcy5sZW5ndGgmJih0aGlzLl9nZXRCb3VuZGluZ1JlY3QoKSx0aGlzLnN0YW1wcy5mb3JFYWNoKHRoaXMuX21hbmFnZVN0YW1wLHRoaXMpKX0sZi5fZ2V0Qm91bmRpbmdSZWN0PWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGU9dGhpcy5zaXplO3RoaXMuX2JvdW5kaW5nUmVjdD17bGVmdDp0LmxlZnQrZS5wYWRkaW5nTGVmdCtlLmJvcmRlckxlZnRXaWR0aCx0b3A6dC50b3ArZS5wYWRkaW5nVG9wK2UuYm9yZGVyVG9wV2lkdGgscmlnaHQ6dC5yaWdodC0oZS5wYWRkaW5nUmlnaHQrZS5ib3JkZXJSaWdodFdpZHRoKSxib3R0b206dC5ib3R0b20tKGUucGFkZGluZ0JvdHRvbStlLmJvcmRlckJvdHRvbVdpZHRoKX19LGYuX21hbmFnZVN0YW1wPWQsZi5fZ2V0RWxlbWVudE9mZnNldD1mdW5jdGlvbih0KXt2YXIgZT10LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLG49dGhpcy5fYm91bmRpbmdSZWN0LG89aSh0KSxyPXtsZWZ0OmUubGVmdC1uLmxlZnQtby5tYXJnaW5MZWZ0LHRvcDplLnRvcC1uLnRvcC1vLm1hcmdpblRvcCxyaWdodDpuLnJpZ2h0LWUucmlnaHQtby5tYXJnaW5SaWdodCxib3R0b206bi5ib3R0b20tZS5ib3R0b20tby5tYXJnaW5Cb3R0b219O3JldHVybiByfSxmLmhhbmRsZUV2ZW50PW4uaGFuZGxlRXZlbnQsZi5iaW5kUmVzaXplPWZ1bmN0aW9uKCl7dC5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsdGhpcyksdGhpcy5pc1Jlc2l6ZUJvdW5kPSEwfSxmLnVuYmluZFJlc2l6ZT1mdW5jdGlvbigpe3QucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMpLHRoaXMuaXNSZXNpemVCb3VuZD0hMX0sZi5vbnJlc2l6ZT1mdW5jdGlvbigpe3RoaXMucmVzaXplKCl9LG4uZGVib3VuY2VNZXRob2QocixcIm9ucmVzaXplXCIsMTAwKSxmLnJlc2l6ZT1mdW5jdGlvbigpe3RoaXMuaXNSZXNpemVCb3VuZCYmdGhpcy5uZWVkc1Jlc2l6ZUxheW91dCgpJiZ0aGlzLmxheW91dCgpfSxmLm5lZWRzUmVzaXplTGF5b3V0PWZ1bmN0aW9uKCl7dmFyIHQ9aSh0aGlzLmVsZW1lbnQpLGU9dGhpcy5zaXplJiZ0O3JldHVybiBlJiZ0LmlubmVyV2lkdGghPT10aGlzLnNpemUuaW5uZXJXaWR0aH0sZi5hZGRJdGVtcz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLl9pdGVtaXplKHQpO3JldHVybiBlLmxlbmd0aCYmKHRoaXMuaXRlbXM9dGhpcy5pdGVtcy5jb25jYXQoZSkpLGV9LGYuYXBwZW5kZWQ9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5hZGRJdGVtcyh0KTtlLmxlbmd0aCYmKHRoaXMubGF5b3V0SXRlbXMoZSwhMCksdGhpcy5yZXZlYWwoZSkpfSxmLnByZXBlbmRlZD1mdW5jdGlvbih0KXt2YXIgZT10aGlzLl9pdGVtaXplKHQpO2lmKGUubGVuZ3RoKXt2YXIgaT10aGlzLml0ZW1zLnNsaWNlKDApO3RoaXMuaXRlbXM9ZS5jb25jYXQoaSksdGhpcy5fcmVzZXRMYXlvdXQoKSx0aGlzLl9tYW5hZ2VTdGFtcHMoKSx0aGlzLmxheW91dEl0ZW1zKGUsITApLHRoaXMucmV2ZWFsKGUpLHRoaXMubGF5b3V0SXRlbXMoaSl9fSxmLnJldmVhbD1mdW5jdGlvbih0KXtpZih0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwicmV2ZWFsXCIsdCksdCYmdC5sZW5ndGgpe3ZhciBlPXRoaXMudXBkYXRlU3RhZ2dlcigpO3QuZm9yRWFjaChmdW5jdGlvbih0LGkpe3Quc3RhZ2dlcihpKmUpLHQucmV2ZWFsKCl9KX19LGYuaGlkZT1mdW5jdGlvbih0KXtpZih0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwiaGlkZVwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgZT10aGlzLnVwZGF0ZVN0YWdnZXIoKTt0LmZvckVhY2goZnVuY3Rpb24odCxpKXt0LnN0YWdnZXIoaSplKSx0LmhpZGUoKX0pfX0sZi5yZXZlYWxJdGVtRWxlbWVudHM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtcyh0KTt0aGlzLnJldmVhbChlKX0sZi5oaWRlSXRlbUVsZW1lbnRzPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5oaWRlKGUpfSxmLmdldEl0ZW09ZnVuY3Rpb24odCl7Zm9yKHZhciBlPTA7ZTx0aGlzLml0ZW1zLmxlbmd0aDtlKyspe3ZhciBpPXRoaXMuaXRlbXNbZV07aWYoaS5lbGVtZW50PT10KXJldHVybiBpfX0sZi5nZXRJdGVtcz1mdW5jdGlvbih0KXt0PW4ubWFrZUFycmF5KHQpO3ZhciBlPVtdO3JldHVybiB0LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIGk9dGhpcy5nZXRJdGVtKHQpO2kmJmUucHVzaChpKX0sdGhpcyksZX0sZi5yZW1vdmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtcyh0KTt0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwicmVtb3ZlXCIsZSksZSYmZS5sZW5ndGgmJmUuZm9yRWFjaChmdW5jdGlvbih0KXt0LnJlbW92ZSgpLG4ucmVtb3ZlRnJvbSh0aGlzLml0ZW1zLHQpfSx0aGlzKX0sZi5kZXN0cm95PWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5lbGVtZW50LnN0eWxlO3QuaGVpZ2h0PVwiXCIsdC5wb3NpdGlvbj1cIlwiLHQud2lkdGg9XCJcIix0aGlzLml0ZW1zLmZvckVhY2goZnVuY3Rpb24odCl7dC5kZXN0cm95KCl9KSx0aGlzLnVuYmluZFJlc2l6ZSgpO3ZhciBlPXRoaXMuZWxlbWVudC5vdXRsYXllckdVSUQ7ZGVsZXRlIGNbZV0sZGVsZXRlIHRoaXMuZWxlbWVudC5vdXRsYXllckdVSUQsdSYmdS5yZW1vdmVEYXRhKHRoaXMuZWxlbWVudCx0aGlzLmNvbnN0cnVjdG9yLm5hbWVzcGFjZSl9LHIuZGF0YT1mdW5jdGlvbih0KXt0PW4uZ2V0UXVlcnlFbGVtZW50KHQpO3ZhciBlPXQmJnQub3V0bGF5ZXJHVUlEO3JldHVybiBlJiZjW2VdfSxyLmNyZWF0ZT1mdW5jdGlvbih0LGUpe3ZhciBpPXMocik7cmV0dXJuIGkuZGVmYXVsdHM9bi5leHRlbmQoe30sci5kZWZhdWx0cyksbi5leHRlbmQoaS5kZWZhdWx0cyxlKSxpLmNvbXBhdE9wdGlvbnM9bi5leHRlbmQoe30sci5jb21wYXRPcHRpb25zKSxpLm5hbWVzcGFjZT10LGkuZGF0YT1yLmRhdGEsaS5JdGVtPXMobyksbi5odG1sSW5pdChpLHQpLHUmJnUuYnJpZGdldCYmdS5icmlkZ2V0KHQsaSksaX07dmFyIG09e21zOjEsczoxZTN9O3JldHVybiByLkl0ZW09byxyfSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFtcIm91dGxheWVyL291dGxheWVyXCIsXCJnZXQtc2l6ZS9nZXQtc2l6ZVwiXSxlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHJlcXVpcmUoXCJvdXRsYXllclwiKSxyZXF1aXJlKFwiZ2V0LXNpemVcIikpOnQuTWFzb25yeT1lKHQuT3V0bGF5ZXIsdC5nZXRTaXplKX0od2luZG93LGZ1bmN0aW9uKHQsZSl7dmFyIGk9dC5jcmVhdGUoXCJtYXNvbnJ5XCIpO2kuY29tcGF0T3B0aW9ucy5maXRXaWR0aD1cImlzRml0V2lkdGhcIjt2YXIgbj1pLnByb3RvdHlwZTtyZXR1cm4gbi5fcmVzZXRMYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLmdldFNpemUoKSx0aGlzLl9nZXRNZWFzdXJlbWVudChcImNvbHVtbldpZHRoXCIsXCJvdXRlcldpZHRoXCIpLHRoaXMuX2dldE1lYXN1cmVtZW50KFwiZ3V0dGVyXCIsXCJvdXRlcldpZHRoXCIpLHRoaXMubWVhc3VyZUNvbHVtbnMoKSx0aGlzLmNvbFlzPVtdO2Zvcih2YXIgdD0wO3Q8dGhpcy5jb2xzO3QrKyl0aGlzLmNvbFlzLnB1c2goMCk7dGhpcy5tYXhZPTAsdGhpcy5ob3Jpem9udGFsQ29sSW5kZXg9MH0sbi5tZWFzdXJlQ29sdW1ucz1mdW5jdGlvbigpe2lmKHRoaXMuZ2V0Q29udGFpbmVyV2lkdGgoKSwhdGhpcy5jb2x1bW5XaWR0aCl7dmFyIHQ9dGhpcy5pdGVtc1swXSxpPXQmJnQuZWxlbWVudDt0aGlzLmNvbHVtbldpZHRoPWkmJmUoaSkub3V0ZXJXaWR0aHx8dGhpcy5jb250YWluZXJXaWR0aH12YXIgbj10aGlzLmNvbHVtbldpZHRoKz10aGlzLmd1dHRlcixvPXRoaXMuY29udGFpbmVyV2lkdGgrdGhpcy5ndXR0ZXIscj1vL24scz1uLW8lbixhPXMmJjE+cz9cInJvdW5kXCI6XCJmbG9vclwiO3I9TWF0aFthXShyKSx0aGlzLmNvbHM9TWF0aC5tYXgociwxKX0sbi5nZXRDb250YWluZXJXaWR0aD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuX2dldE9wdGlvbihcImZpdFdpZHRoXCIpLGk9dD90aGlzLmVsZW1lbnQucGFyZW50Tm9kZTp0aGlzLmVsZW1lbnQsbj1lKGkpO3RoaXMuY29udGFpbmVyV2lkdGg9biYmbi5pbm5lcldpZHRofSxuLl9nZXRJdGVtTGF5b3V0UG9zaXRpb249ZnVuY3Rpb24odCl7dC5nZXRTaXplKCk7dmFyIGU9dC5zaXplLm91dGVyV2lkdGgldGhpcy5jb2x1bW5XaWR0aCxpPWUmJjE+ZT9cInJvdW5kXCI6XCJjZWlsXCIsbj1NYXRoW2ldKHQuc2l6ZS5vdXRlcldpZHRoL3RoaXMuY29sdW1uV2lkdGgpO249TWF0aC5taW4obix0aGlzLmNvbHMpO2Zvcih2YXIgbz10aGlzLm9wdGlvbnMuaG9yaXpvbnRhbE9yZGVyP1wiX2dldEhvcml6b250YWxDb2xQb3NpdGlvblwiOlwiX2dldFRvcENvbFBvc2l0aW9uXCIscj10aGlzW29dKG4sdCkscz17eDp0aGlzLmNvbHVtbldpZHRoKnIuY29sLHk6ci55fSxhPXIueSt0LnNpemUub3V0ZXJIZWlnaHQsaD1uK3IuY29sLHU9ci5jb2w7aD51O3UrKyl0aGlzLmNvbFlzW3VdPWE7cmV0dXJuIHN9LG4uX2dldFRvcENvbFBvc2l0aW9uPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX2dldFRvcENvbEdyb3VwKHQpLGk9TWF0aC5taW4uYXBwbHkoTWF0aCxlKTtyZXR1cm57Y29sOmUuaW5kZXhPZihpKSx5Oml9fSxuLl9nZXRUb3BDb2xHcm91cD1mdW5jdGlvbih0KXtpZigyPnQpcmV0dXJuIHRoaXMuY29sWXM7Zm9yKHZhciBlPVtdLGk9dGhpcy5jb2xzKzEtdCxuPTA7aT5uO24rKyllW25dPXRoaXMuX2dldENvbEdyb3VwWShuLHQpO3JldHVybiBlfSxuLl9nZXRDb2xHcm91cFk9ZnVuY3Rpb24odCxlKXtpZigyPmUpcmV0dXJuIHRoaXMuY29sWXNbdF07dmFyIGk9dGhpcy5jb2xZcy5zbGljZSh0LHQrZSk7cmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsaSl9LG4uX2dldEhvcml6b250YWxDb2xQb3NpdGlvbj1mdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMuaG9yaXpvbnRhbENvbEluZGV4JXRoaXMuY29scyxuPXQ+MSYmaSt0PnRoaXMuY29scztpPW4/MDppO3ZhciBvPWUuc2l6ZS5vdXRlcldpZHRoJiZlLnNpemUub3V0ZXJIZWlnaHQ7cmV0dXJuIHRoaXMuaG9yaXpvbnRhbENvbEluZGV4PW8/aSt0OnRoaXMuaG9yaXpvbnRhbENvbEluZGV4LHtjb2w6aSx5OnRoaXMuX2dldENvbEdyb3VwWShpLHQpfX0sbi5fbWFuYWdlU3RhbXA9ZnVuY3Rpb24odCl7dmFyIGk9ZSh0KSxuPXRoaXMuX2dldEVsZW1lbnRPZmZzZXQodCksbz10aGlzLl9nZXRPcHRpb24oXCJvcmlnaW5MZWZ0XCIpLHI9bz9uLmxlZnQ6bi5yaWdodCxzPXIraS5vdXRlcldpZHRoLGE9TWF0aC5mbG9vcihyL3RoaXMuY29sdW1uV2lkdGgpO2E9TWF0aC5tYXgoMCxhKTt2YXIgaD1NYXRoLmZsb29yKHMvdGhpcy5jb2x1bW5XaWR0aCk7aC09cyV0aGlzLmNvbHVtbldpZHRoPzA6MSxoPU1hdGgubWluKHRoaXMuY29scy0xLGgpO2Zvcih2YXIgdT10aGlzLl9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIiksZD0odT9uLnRvcDpuLmJvdHRvbSkraS5vdXRlckhlaWdodCxsPWE7aD49bDtsKyspdGhpcy5jb2xZc1tsXT1NYXRoLm1heChkLHRoaXMuY29sWXNbbF0pfSxuLl9nZXRDb250YWluZXJTaXplPWZ1bmN0aW9uKCl7dGhpcy5tYXhZPU1hdGgubWF4LmFwcGx5KE1hdGgsdGhpcy5jb2xZcyk7dmFyIHQ9e2hlaWdodDp0aGlzLm1heFl9O3JldHVybiB0aGlzLl9nZXRPcHRpb24oXCJmaXRXaWR0aFwiKSYmKHQud2lkdGg9dGhpcy5fZ2V0Q29udGFpbmVyRml0V2lkdGgoKSksdH0sbi5fZ2V0Q29udGFpbmVyRml0V2lkdGg9ZnVuY3Rpb24oKXtmb3IodmFyIHQ9MCxlPXRoaXMuY29sczstLWUmJjA9PT10aGlzLmNvbFlzW2VdOyl0Kys7cmV0dXJuKHRoaXMuY29scy10KSp0aGlzLmNvbHVtbldpZHRoLXRoaXMuZ3V0dGVyfSxuLm5lZWRzUmVzaXplTGF5b3V0PWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5jb250YWluZXJXaWR0aDtyZXR1cm4gdGhpcy5nZXRDb250YWluZXJXaWR0aCgpLHQhPXRoaXMuY29udGFpbmVyV2lkdGh9LGl9KTsiLCJcbmZ1bmN0aW9uIHN0YXJGdW5jdGlvbih4LCB5KSB7XG5cbiAgICBhcGlfdXJsID0gJy9hcGkvdjEvc3Rhci8nICsgeSArICcvJztcblxuICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwiZmEtc3Rhci1vXCIpKXtcbiAgICAgICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibm90LWxvZ2dlZC1pblwiKSl7XG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XG4gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xuICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuZmFkZUluKCk7XG4vLyAgICAgICAgICAgICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlT3V0KCk7XG4gICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyLW9cIilcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LmFkZChcImZhLXN0YXJcIilcbiAgICAgICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsICAgIC8vWW91ciBhcGkgdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnUFVUJywgICAvL3R5cGUgaXMgYW55IEhUVFAgbWV0aG9kXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sICAgICAgLy9EYXRhIGFzIGpzIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJmYS1zdGFyXCIpKXtcblxuICAgICAgICB4LmNsYXNzTGlzdC5yZW1vdmUoXCJmYS1zdGFyXCIpXG4gICAgICAgIHguY2xhc3NMaXN0LmFkZChcImZhLXN0YXItb1wiKVxuICAgICAgICAkLmFqYXgoe1xuICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdERUxFVEUnLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgO1xuICAgIH1cblxufVxuXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XG4gICQodGhpcykuY2xvc2VzdCgnLmNhcmQnKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XG4gICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlSW4oKTtcbn0pIiwiKGZ1bmN0aW9uKCQpe1widXNlIHN0cmljdFwiO3ZhciBNYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24oZWxlbWVudCxvcHRpb25zKXt2YXIgbXM9dGhpczt2YXIgZGVmYXVsdHM9e2FsbG93RnJlZUVudHJpZXM6dHJ1ZSxhbGxvd0R1cGxpY2F0ZXM6ZmFsc2UsYWpheENvbmZpZzp7fSxhdXRvU2VsZWN0OnRydWUsc2VsZWN0Rmlyc3Q6ZmFsc2UscXVlcnlQYXJhbTpcInF1ZXJ5XCIsYmVmb3JlU2VuZDpmdW5jdGlvbigpe30sY2xzOlwiXCIsZGF0YTpudWxsLGRhdGFVcmxQYXJhbXM6e30sZGlzYWJsZWQ6ZmFsc2UsZGlzYWJsZWRGaWVsZDpudWxsLGRpc3BsYXlGaWVsZDpcIm5hbWVcIixlZGl0YWJsZTp0cnVlLGV4cGFuZGVkOmZhbHNlLGV4cGFuZE9uRm9jdXM6ZmFsc2UsZ3JvdXBCeTpudWxsLGhpZGVUcmlnZ2VyOmZhbHNlLGhpZ2hsaWdodDp0cnVlLGlkOm51bGwsaW5mb01zZ0NsczpcIlwiLGlucHV0Q2ZnOnt9LGludmFsaWRDbHM6XCJtcy1pbnZcIixtYXRjaENhc2U6ZmFsc2UsbWF4RHJvcEhlaWdodDoyOTAsbWF4RW50cnlMZW5ndGg6bnVsbCxtYXhFbnRyeVJlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiUGxlYXNlIHJlZHVjZSB5b3VyIGVudHJ5IGJ5IFwiK3YrXCIgY2hhcmFjdGVyXCIrKHY+MT9cInNcIjpcIlwiKX0sbWF4U3VnZ2VzdGlvbnM6bnVsbCxtYXhTZWxlY3Rpb246MTAsbWF4U2VsZWN0aW9uUmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gXCIrditcIiBpdGVtXCIrKHY+MT9cInNcIjpcIlwiKX0sbWV0aG9kOlwiUE9TVFwiLG1pbkNoYXJzOjAsbWluQ2hhcnNSZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIlBsZWFzZSB0eXBlIFwiK3YrXCIgbW9yZSBjaGFyYWN0ZXJcIisodj4xP1wic1wiOlwiXCIpfSxtb2RlOlwibG9jYWxcIixuYW1lOm51bGwsbm9TdWdnZXN0aW9uVGV4dDpcIk5vIHN1Z2dlc3Rpb25zXCIscGxhY2Vob2xkZXI6XCJUeXBlIG9yIGNsaWNrIGhlcmVcIixyZW5kZXJlcjpudWxsLHJlcXVpcmVkOmZhbHNlLHJlc3VsdEFzU3RyaW5nOmZhbHNlLHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOlwiLFwiLHJlc3VsdHNGaWVsZDpcInJlc3VsdHNcIixzZWxlY3Rpb25DbHM6XCJcIixzZWxlY3Rpb25Db250YWluZXI6bnVsbCxzZWxlY3Rpb25Qb3NpdGlvbjpcImlubmVyXCIsc2VsZWN0aW9uUmVuZGVyZXI6bnVsbCxzZWxlY3Rpb25TdGFja2VkOmZhbHNlLHNvcnREaXI6XCJhc2NcIixzb3J0T3JkZXI6bnVsbCxzdHJpY3RTdWdnZXN0OmZhbHNlLHN0eWxlOlwiXCIsdG9nZ2xlT25DbGljazpmYWxzZSx0eXBlRGVsYXk6NDAwLHVzZVRhYktleTpmYWxzZSx1c2VDb21tYUtleTp0cnVlLHVzZVplYnJhU3R5bGU6ZmFsc2UsdmFsdWU6bnVsbCx2YWx1ZUZpZWxkOlwiaWRcIix2cmVnZXg6bnVsbCx2dHlwZTpudWxsfTt2YXIgY29uZj0kLmV4dGVuZCh7fSxvcHRpb25zKTt2YXIgY2ZnPSQuZXh0ZW5kKHRydWUse30sZGVmYXVsdHMsY29uZik7dGhpcy5hZGRUb1NlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyxpc1NpbGVudCl7aWYoIWNmZy5tYXhTZWxlY3Rpb258fF9zZWxlY3Rpb24ubGVuZ3RoPGNmZy5tYXhTZWxlY3Rpb24pe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe2lmKGNmZy5hbGxvd0R1cGxpY2F0ZXN8fCQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKT09PS0xKXtfc2VsZWN0aW9uLnB1c2goanNvbik7dmFsdWVjaGFuZ2VkPXRydWV9fSk7aWYodmFsdWVjaGFuZ2VkPT09dHJ1ZSl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7dGhpcy5lbXB0eSgpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfX19dGhpcy5pbnB1dC5hdHRyKFwicGxhY2Vob2xkZXJcIixjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJnRoaXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcil9O3RoaXMuY2xlYXI9ZnVuY3Rpb24oaXNTaWxlbnQpe3RoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbihfc2VsZWN0aW9uLnNsaWNlKDApLGlzU2lsZW50KX07dGhpcy5jb2xsYXBzZT1mdW5jdGlvbigpe2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3RoaXMuY29tYm9ib3guZGV0YWNoKCk7Y2ZnLmV4cGFuZGVkPWZhbHNlOyQodGhpcykudHJpZ2dlcihcImNvbGxhcHNlXCIsW3RoaXNdKX19O3RoaXMuZGlzYWJsZT1mdW5jdGlvbigpe3RoaXMuY29udGFpbmVyLmFkZENsYXNzKFwibXMtY3RuLWRpc2FibGVkXCIpO2NmZy5kaXNhYmxlZD10cnVlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLHRydWUpfTt0aGlzLmVtcHR5PWZ1bmN0aW9uKCl7dGhpcy5pbnB1dC52YWwoXCJcIil9O3RoaXMuZW5hYmxlPWZ1bmN0aW9uKCl7dGhpcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZGlzYWJsZWRcIik7Y2ZnLmRpc2FibGVkPWZhbHNlO21zLmlucHV0LmF0dHIoXCJkaXNhYmxlZFwiLGZhbHNlKX07dGhpcy5leHBhbmQ9ZnVuY3Rpb24oKXtpZighY2ZnLmV4cGFuZGVkJiYodGhpcy5pbnB1dC52YWwoKS5sZW5ndGg+PWNmZy5taW5DaGFyc3x8dGhpcy5jb21ib2JveC5jaGlsZHJlbigpLnNpemUoKT4wKSl7dGhpcy5jb21ib2JveC5hcHBlbmRUbyh0aGlzLmNvbnRhaW5lcik7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7Y2ZnLmV4cGFuZGVkPXRydWU7JCh0aGlzKS50cmlnZ2VyKFwiZXhwYW5kXCIsW3RoaXNdKX19O3RoaXMuaXNEaXNhYmxlZD1mdW5jdGlvbigpe3JldHVybiBjZmcuZGlzYWJsZWR9O3RoaXMuaXNWYWxpZD1mdW5jdGlvbigpe3ZhciB2YWxpZD1jZmcucmVxdWlyZWQ9PT1mYWxzZXx8X3NlbGVjdGlvbi5sZW5ndGg+MDtpZihjZmcudnR5cGV8fGNmZy52cmVnZXgpeyQuZWFjaChfc2VsZWN0aW9uLGZ1bmN0aW9uKGluZGV4LGl0ZW0pe3ZhbGlkPXZhbGlkJiZzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0oaXRlbVtjZmcudmFsdWVGaWVsZF0pfSl9cmV0dXJuIHZhbGlkfTt0aGlzLmdldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24oKXtyZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXN9O3RoaXMuZ2V0TmFtZT1mdW5jdGlvbigpe3JldHVybiBjZmcubmFtZX07dGhpcy5nZXRTZWxlY3Rpb249ZnVuY3Rpb24oKXtyZXR1cm4gX3NlbGVjdGlvbn07dGhpcy5nZXRSYXdWYWx1ZT1mdW5jdGlvbigpe3JldHVybiBtcy5pbnB1dC52YWwoKX07dGhpcy5nZXRWYWx1ZT1mdW5jdGlvbigpe3JldHVybiAkLm1hcChfc2VsZWN0aW9uLGZ1bmN0aW9uKG8pe3JldHVybiBvW2NmZy52YWx1ZUZpZWxkXX0pfTt0aGlzLnJlbW92ZUZyb21TZWxlY3Rpb249ZnVuY3Rpb24oaXRlbXMsaXNTaWxlbnQpe2lmKCEkLmlzQXJyYXkoaXRlbXMpKXtpdGVtcz1baXRlbXNdfXZhciB2YWx1ZWNoYW5nZWQ9ZmFsc2U7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LGpzb24pe3ZhciBpPSQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSxtcy5nZXRWYWx1ZSgpKTtpZihpPi0xKXtfc2VsZWN0aW9uLnNwbGljZShpLDEpO3ZhbHVlY2hhbmdlZD10cnVlfX0pO2lmKHZhbHVlY2hhbmdlZD09PXRydWUpe3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKGlzU2lsZW50IT09dHJ1ZSl7JCh0aGlzKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW3RoaXMsdGhpcy5nZXRTZWxlY3Rpb24oKV0pfWlmKGNmZy5leHBhbmRPbkZvY3VzKXttcy5leHBhbmQoKX1pZihjZmcuZXhwYW5kZWQpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfX10aGlzLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKX07dGhpcy5nZXREYXRhPWZ1bmN0aW9uKCl7cmV0dXJuIF9jYkRhdGF9O3RoaXMuc2V0RGF0YT1mdW5jdGlvbihkYXRhKXtjZmcuZGF0YT1kYXRhO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpfTt0aGlzLnNldE5hbWU9ZnVuY3Rpb24obmFtZSl7Y2ZnLm5hbWU9bmFtZTtpZihuYW1lKXtjZmcubmFtZSs9bmFtZS5pbmRleE9mKFwiW11cIik+MD9cIlwiOlwiW11cIn1pZihtcy5fdmFsdWVDb250YWluZXIpeyQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSxmdW5jdGlvbihpLGVsKXtlbC5uYW1lPWNmZy5uYW1lfSl9fTt0aGlzLnNldFNlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyl7dGhpcy5jbGVhcigpO3RoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpfTt0aGlzLnNldFZhbHVlPWZ1bmN0aW9uKHZhbHVlcyl7dmFyIGl0ZW1zPVtdOyQuZWFjaCh2YWx1ZXMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBmb3VuZD1mYWxzZTskLmVhY2goX2NiRGF0YSxmdW5jdGlvbihpLGl0ZW0pe2lmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdPT12YWx1ZSl7aXRlbXMucHVzaChpdGVtKTtmb3VuZD10cnVlO3JldHVybiBmYWxzZX19KTtpZighZm91bmQpe2lmKHR5cGVvZiB2YWx1ZT09PVwib2JqZWN0XCIpe2l0ZW1zLnB1c2godmFsdWUpfWVsc2V7dmFyIGpzb249e307anNvbltjZmcudmFsdWVGaWVsZF09dmFsdWU7anNvbltjZmcuZGlzcGxheUZpZWxkXT12YWx1ZTtpdGVtcy5wdXNoKGpzb24pfX19KTtpZihpdGVtcy5sZW5ndGg+MCl7dGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyl9fTt0aGlzLnNldERhdGFVcmxQYXJhbXM9ZnVuY3Rpb24ocGFyYW1zKXtjZmcuZGF0YVVybFBhcmFtcz0kLmV4dGVuZCh7fSxwYXJhbXMpfTt2YXIgX3NlbGVjdGlvbj1bXSxfY29tYm9JdGVtSGVpZ2h0PTAsX3RpbWVyLF9oYXNGb2N1cz1mYWxzZSxfZ3JvdXBzPW51bGwsX2NiRGF0YT1bXSxfY3RybERvd249ZmFsc2UsS0VZQ09ERVM9e0JBQ0tTUEFDRTo4LFRBQjo5LEVOVEVSOjEzLENUUkw6MTcsRVNDOjI3LFNQQUNFOjMyLFVQQVJST1c6MzgsRE9XTkFSUk9XOjQwLENPTU1BOjE4OH07dmFyIHNlbGY9e19kaXNwbGF5U3VnZ2VzdGlvbnM6ZnVuY3Rpb24oZGF0YSl7bXMuY29tYm9ib3guc2hvdygpO21zLmNvbWJvYm94LmVtcHR5KCk7dmFyIHJlc0hlaWdodD0wLG5iR3JvdXBzPTA7aWYoX2dyb3Vwcz09PW51bGwpe3NlbGYuX3JlbmRlckNvbWJvSXRlbXMoZGF0YSk7cmVzSGVpZ2h0PV9jb21ib0l0ZW1IZWlnaHQqZGF0YS5sZW5ndGh9ZWxzZXtmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcyl7bmJHcm91cHMrPTE7JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtZ3JvdXBcIixodG1sOmdycE5hbWV9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7c2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhfZ3JvdXBzW2dycE5hbWVdLml0ZW1zLHRydWUpfXZhciBfZ3JvdXBJdGVtSGVpZ2h0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWdyb3VwXCIpLm91dGVySGVpZ2h0KCk7aWYoX2dyb3VwSXRlbUhlaWdodCE9PW51bGwpe3ZhciB0bXBSZXNIZWlnaHQ9bmJHcm91cHMqX2dyb3VwSXRlbUhlaWdodDtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCpkYXRhLmxlbmd0aCt0bXBSZXNIZWlnaHR9ZWxzZXtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCooZGF0YS5sZW5ndGgrbmJHcm91cHMpfX1pZihyZXNIZWlnaHQ8bXMuY29tYm9ib3guaGVpZ2h0KCl8fHJlc0hlaWdodDw9Y2ZnLm1heERyb3BIZWlnaHQpe21zLmNvbWJvYm94LmhlaWdodChyZXNIZWlnaHQpfWVsc2UgaWYocmVzSGVpZ2h0Pj1tcy5jb21ib2JveC5oZWlnaHQoKSYmcmVzSGVpZ2h0PmNmZy5tYXhEcm9wSGVpZ2h0KXttcy5jb21ib2JveC5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpfWlmKGRhdGEubGVuZ3RoPT09MSYmY2ZnLmF1dG9TZWxlY3Q9PT10cnVlKXttcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcihcIjpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGNmZy5zZWxlY3RGaXJzdD09PXRydWUpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKFwiOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpLmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfWlmKGRhdGEubGVuZ3RoPT09MCYmbXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCIpe3ZhciBub1N1Z2dlc3Rpb25UZXh0PWNmZy5ub1N1Z2dlc3Rpb25UZXh0LnJlcGxhY2UoL1xce1xcey4qXFx9XFx9Lyxtcy5pbnB1dC52YWwoKSk7c2VsZi5fdXBkYXRlSGVscGVyKG5vU3VnZ2VzdGlvblRleHQpO21zLmNvbGxhcHNlKCl9aWYoY2ZnLmFsbG93RnJlZUVudHJpZXM9PT1mYWxzZSl7aWYoZGF0YS5sZW5ndGg9PT0wKXskKG1zLmlucHV0KS5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7bXMuY29tYm9ib3guaGlkZSgpfWVsc2V7JChtcy5pbnB1dCkucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpfX19LF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OmZ1bmN0aW9uKGRhdGEpe3ZhciBqc29uPVtdOyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LHMpe3ZhciBlbnRyeT17fTtlbnRyeVtjZmcuZGlzcGxheUZpZWxkXT1lbnRyeVtjZmcudmFsdWVGaWVsZF09JC50cmltKHMpO2pzb24ucHVzaChlbnRyeSl9KTtyZXR1cm4ganNvbn0sX2hpZ2hsaWdodFN1Z2dlc3Rpb246ZnVuY3Rpb24oaHRtbCl7dmFyIHE9bXMuaW5wdXQudmFsKCk7dmFyIHNwZWNpYWxDaGFyYWN0ZXJzPVtcIl5cIixcIiRcIixcIipcIixcIitcIixcIj9cIixcIi5cIixcIihcIixcIilcIixcIjpcIixcIiFcIixcInxcIixcIntcIixcIn1cIixcIltcIixcIl1cIl07JC5lYWNoKHNwZWNpYWxDaGFyYWN0ZXJzLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXtxPXEucmVwbGFjZSh2YWx1ZSxcIlxcXFxcIit2YWx1ZSl9KTtpZihxLmxlbmd0aD09PTApe3JldHVybiBodG1sfXZhciBnbG9iPWNmZy5tYXRjaENhc2U9PT10cnVlP1wiZ1wiOlwiZ2lcIjtyZXR1cm4gaHRtbC5yZXBsYWNlKG5ldyBSZWdFeHAoXCIoXCIrcStcIikoPyEoW148XSspPz4pXCIsZ2xvYiksXCI8ZW0+JDE8L2VtPlwiKX0sX21vdmVTZWxlY3RlZFJvdzpmdW5jdGlvbihkaXIpe2lmKCFjZmcuZXhwYW5kZWQpe21zLmV4cGFuZCgpfXZhciBsaXN0LHN0YXJ0LGFjdGl2ZSxzY3JvbGxQb3M7bGlzdD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpO2lmKGRpcj09PVwiZG93blwiKXtzdGFydD1saXN0LmVxKDApfWVsc2V7c3RhcnQ9bGlzdC5maWx0ZXIoXCI6bGFzdFwiKX1hY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIik7aWYoYWN0aXZlLmxlbmd0aD4wKXtpZihkaXI9PT1cImRvd25cIil7c3RhcnQ9YWN0aXZlLm5leHRBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmVxKDApfXNjcm9sbFBvcz1tcy5jb21ib2JveC5zY3JvbGxUb3AoKTttcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7aWYoc3RhcnRbMF0ub2Zmc2V0VG9wK3N0YXJ0Lm91dGVySGVpZ2h0KCk+bXMuY29tYm9ib3guaGVpZ2h0KCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChzY3JvbGxQb3MrX2NvbWJvSXRlbUhlaWdodCl9fWVsc2V7c3RhcnQ9YWN0aXZlLnByZXZBbGwoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIikuZmlyc3QoKTtpZihzdGFydC5sZW5ndGg9PT0wKXtzdGFydD1saXN0LmZpbHRlcihcIjpsYXN0XCIpO21zLmNvbWJvYm94LnNjcm9sbFRvcChfY29tYm9JdGVtSGVpZ2h0Kmxpc3QubGVuZ3RoKX1pZihzdGFydFswXS5vZmZzZXRUb3A8bXMuY29tYm9ib3guc2Nyb2xsVG9wKCkpe21zLmNvbWJvYm94LnNjcm9sbFRvcChtcy5jb21ib2JveC5zY3JvbGxUb3AoKS1fY29tYm9JdGVtSGVpZ2h0KX19fWxpc3QucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7c3RhcnQuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9LF9wcm9jZXNzU3VnZ2VzdGlvbnM6ZnVuY3Rpb24oc291cmNlKXt2YXIganNvbj1udWxsLGRhdGE9c291cmNlfHxjZmcuZGF0YTtpZihkYXRhIT09bnVsbCl7aWYodHlwZW9mIGRhdGE9PT1cImZ1bmN0aW9uXCIpe2RhdGE9ZGF0YS5jYWxsKG1zLG1zLmdldFJhd1ZhbHVlKCkpfWlmKHR5cGVvZiBkYXRhPT09XCJzdHJpbmdcIil7JChtcykudHJpZ2dlcihcImJlZm9yZWxvYWRcIixbbXNdKTt2YXIgcXVlcnlQYXJhbXM9e307cXVlcnlQYXJhbXNbY2ZnLnF1ZXJ5UGFyYW1dPW1zLmlucHV0LnZhbCgpO3ZhciBwYXJhbXM9JC5leHRlbmQocXVlcnlQYXJhbXMsY2ZnLmRhdGFVcmxQYXJhbXMpOyQuYWpheCgkLmV4dGVuZCh7dHlwZTpjZmcubWV0aG9kLHVybDpkYXRhLGRhdGE6cGFyYW1zLGJlZm9yZVNlbmQ6Y2ZnLmJlZm9yZVNlbmQsc3VjY2VzczpmdW5jdGlvbihhc3luY0RhdGEpe2pzb249dHlwZW9mIGFzeW5jRGF0YT09PVwic3RyaW5nXCI/SlNPTi5wYXJzZShhc3luY0RhdGEpOmFzeW5jRGF0YTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoanNvbik7JChtcykudHJpZ2dlcihcImxvYWRcIixbbXMsanNvbl0pO2lmKHNlbGYuX2FzeW5jVmFsdWVzKXttcy5zZXRWYWx1ZSh0eXBlb2Ygc2VsZi5fYXN5bmNWYWx1ZXM9PT1cInN0cmluZ1wiP0pTT04ucGFyc2Uoc2VsZi5fYXN5bmNWYWx1ZXMpOnNlbGYuX2FzeW5jVmFsdWVzKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtkZWxldGUgc2VsZi5fYXN5bmNWYWx1ZXN9fSxlcnJvcjpmdW5jdGlvbigpe3Rocm93XCJDb3VsZCBub3QgcmVhY2ggc2VydmVyXCJ9fSxjZmcuYWpheENvbmZpZykpO3JldHVybn1lbHNle2lmKGRhdGEubGVuZ3RoPjAmJnR5cGVvZiBkYXRhWzBdPT09XCJzdHJpbmdcIil7X2NiRGF0YT1zZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpfWVsc2V7X2NiRGF0YT1kYXRhW2NmZy5yZXN1bHRzRmllbGRdfHxkYXRhfX12YXIgc29ydGVkRGF0YT1jZmcubW9kZT09PVwicmVtb3RlXCI/X2NiRGF0YTpzZWxmLl9zb3J0QW5kVHJpbShfY2JEYXRhKTtzZWxmLl9kaXNwbGF5U3VnZ2VzdGlvbnMoc2VsZi5fZ3JvdXAoc29ydGVkRGF0YSkpfX0sX3JlbmRlcjpmdW5jdGlvbihlbCl7bXMuc2V0TmFtZShjZmcubmFtZSk7bXMuY29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtY3RuIGZvcm0tY29udHJvbCBcIisoY2ZnLnJlc3VsdEFzU3RyaW5nP1wibXMtYXMtc3RyaW5nIFwiOlwiXCIpK2NmZy5jbHMrKCQoZWwpLmhhc0NsYXNzKFwiaW5wdXQtbGdcIik/XCIgaW5wdXQtbGdcIjpcIlwiKSsoJChlbCkuaGFzQ2xhc3MoXCJpbnB1dC1zbVwiKT9cIiBpbnB1dC1zbVwiOlwiXCIpKyhjZmcuZGlzYWJsZWQ9PT10cnVlP1wiIG1zLWN0bi1kaXNhYmxlZFwiOlwiXCIpKyhjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtY3RuLXJlYWRvbmx5XCIpKyhjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZT9cIlwiOlwiIG1zLW5vLXRyaWdnZXJcIiksc3R5bGU6Y2ZnLnN0eWxlLGlkOmNmZy5pZH0pO21zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLHRoaXMpKTttcy5jb250YWluZXIuYmx1cigkLnByb3h5KGhhbmRsZXJzLl9vbkJsdXIsdGhpcykpO21zLmNvbnRhaW5lci5rZXlkb3duKCQucHJveHkoaGFuZGxlcnMuX29uS2V5RG93bix0aGlzKSk7bXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsdGhpcykpO21zLmlucHV0PSQoXCI8aW5wdXQvPlwiLCQuZXh0ZW5kKHt0eXBlOlwidGV4dFwiLFwiY2xhc3NcIjpjZmcuZWRpdGFibGU9PT10cnVlP1wiXCI6XCIgbXMtaW5wdXQtcmVhZG9ubHlcIixyZWFkb25seTohY2ZnLmVkaXRhYmxlLHBsYWNlaG9sZGVyOmNmZy5wbGFjZWhvbGRlcixkaXNhYmxlZDpjZmcuZGlzYWJsZWR9LGNmZy5pbnB1dENmZykpO21zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cyx0aGlzKSk7bXMuaW5wdXQuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25JbnB1dENsaWNrLHRoaXMpKTttcy5jb21ib2JveD0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1jdG4gZHJvcGRvd24tbWVudVwifSkuaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTttcy5jb21ib2JveC5vbihcImNsaWNrXCIsXCJkaXYubXMtcmVzLWl0ZW1cIiwkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbVNlbGVjdGVkLHRoaXMpKTttcy5jb21ib2JveC5vbihcIm1vdXNlb3ZlclwiLFwiZGl2Lm1zLXJlcy1pdGVtXCIsJC5wcm94eShoYW5kbGVycy5fb25Db21ib0l0ZW1Nb3VzZU92ZXIsdGhpcykpO2lmKGNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLnNlbGVjdGlvbkNvbnRhaW5lcj1jZmcuc2VsZWN0aW9uQ29udGFpbmVyOyQobXMuc2VsZWN0aW9uQ29udGFpbmVyKS5hZGRDbGFzcyhcIm1zLXNlbC1jdG5cIil9ZWxzZXttcy5zZWxlY3Rpb25Db250YWluZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtY3RuXCJ9KX1tcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cyx0aGlzKSk7aWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiYhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCl9ZWxzZXttcy5jb250YWluZXIuYXBwZW5kKG1zLmlucHV0KX1tcy5oZWxwZXI9JChcIjxzcGFuLz5cIix7XCJjbGFzc1wiOlwibXMtaGVscGVyIFwiK2NmZy5pbmZvTXNnQ2xzfSk7c2VsZi5fdXBkYXRlSGVscGVyKCk7bXMuY29udGFpbmVyLmFwcGVuZChtcy5oZWxwZXIpOyQoZWwpLnJlcGxhY2VXaXRoKG1zLmNvbnRhaW5lcik7aWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe3N3aXRjaChjZmcuc2VsZWN0aW9uUG9zaXRpb24pe2Nhc2VcImJvdHRvbVwiOm1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25TdGFja2VkPT09dHJ1ZSl7bXMuc2VsZWN0aW9uQ29udGFpbmVyLndpZHRoKG1zLmNvbnRhaW5lci53aWR0aCgpKTttcy5zZWxlY3Rpb25Db250YWluZXIuYWRkQ2xhc3MoXCJtcy1zdGFja2VkXCIpfWJyZWFrO2Nhc2VcInJpZ2h0XCI6bXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7bXMuY29udGFpbmVyLmNzcyhcImZsb2F0XCIsXCJsZWZ0XCIpO2JyZWFrO2RlZmF1bHQ6bXMuY29udGFpbmVyLmFwcGVuZChtcy5zZWxlY3Rpb25Db250YWluZXIpO2JyZWFrfX1pZihjZmcuaGlkZVRyaWdnZXI9PT1mYWxzZSl7bXMudHJpZ2dlcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXRyaWdnZXJcIixodG1sOic8ZGl2IGNsYXNzPVwibXMtdHJpZ2dlci1pY29cIj48L2Rpdj4nfSk7bXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljayx0aGlzKSk7bXMuY29udGFpbmVyLmFwcGVuZChtcy50cmlnZ2VyKX0kKHdpbmRvdykucmVzaXplKCQucHJveHkoaGFuZGxlcnMuX29uV2luZG93UmVzaXplZCx0aGlzKSk7aWYoY2ZnLnZhbHVlIT09bnVsbHx8Y2ZnLmRhdGEhPT1udWxsKXtpZih0eXBlb2YgY2ZnLmRhdGE9PT1cInN0cmluZ1wiKXtzZWxmLl9hc3luY1ZhbHVlcz1jZmcudmFsdWU7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihjZmcudmFsdWUhPT1udWxsKXttcy5zZXRWYWx1ZShjZmcudmFsdWUpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpfX19JChcImJvZHlcIikuY2xpY2soZnVuY3Rpb24oZSl7aWYobXMuY29udGFpbmVyLmhhc0NsYXNzKFwibXMtY3RuLWZvY3VzXCIpJiZtcy5jb250YWluZXIuaGFzKGUudGFyZ2V0KS5sZW5ndGg9PT0wJiZlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZihcIm1zLXJlcy1pdGVtXCIpPDAmJmUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKFwibXMtY2xvc2UtYnRuXCIpPDAmJm1zLmNvbnRhaW5lclswXSE9PWUudGFyZ2V0KXtoYW5kbGVycy5fb25CbHVyKCl9fSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7Y2ZnLmV4cGFuZGVkPWZhbHNlO21zLmV4cGFuZCgpfX0sX3JlbmRlckNvbWJvSXRlbXM6ZnVuY3Rpb24oaXRlbXMsaXNHcm91cGVkKXt2YXIgcmVmPXRoaXMsaHRtbD1cIlwiOyQuZWFjaChpdGVtcyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIGRpc3BsYXllZD1jZmcucmVuZGVyZXIhPT1udWxsP2NmZy5yZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIGRpc2FibGVkPWNmZy5kaXNhYmxlZEZpZWxkIT09bnVsbCYmdmFsdWVbY2ZnLmRpc2FibGVkRmllbGRdPT09dHJ1ZTt2YXIgcmVzdWx0SXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWl0ZW0gXCIrKGlzR3JvdXBlZD9cIm1zLXJlcy1pdGVtLWdyb3VwZWQgXCI6XCJcIikrKGRpc2FibGVkP1wibXMtcmVzLWl0ZW0tZGlzYWJsZWQgXCI6XCJcIikrKGluZGV4JTI9PT0xJiZjZmcudXNlWmVicmFTdHlsZT09PXRydWU/XCJtcy1yZXMtb2RkXCI6XCJcIiksaHRtbDpjZmcuaGlnaGxpZ2h0PT09dHJ1ZT9zZWxmLl9oaWdobGlnaHRTdWdnZXN0aW9uKGRpc3BsYXllZCk6ZGlzcGxheWVkLFwiZGF0YS1qc29uXCI6SlNPTi5zdHJpbmdpZnkodmFsdWUpfSk7aHRtbCs9JChcIjxkaXYvPlwiKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCl9KTttcy5jb21ib2JveC5hcHBlbmQoaHRtbCk7X2NvbWJvSXRlbUhlaWdodD1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOmZpcnN0XCIpLm91dGVySGVpZ2h0KCl9LF9yZW5kZXJTZWxlY3Rpb246ZnVuY3Rpb24oKXt2YXIgcmVmPXRoaXMsdz0wLGlucHV0T2Zmc2V0PTAsaXRlbXM9W10sYXNUZXh0PWNmZy5yZXN1bHRBc1N0cmluZz09PXRydWUmJiFfaGFzRm9jdXM7bXMuc2VsZWN0aW9uQ29udGFpbmVyLmZpbmQoXCIubXMtc2VsLWl0ZW1cIikucmVtb3ZlKCk7aWYobXMuX3ZhbHVlQ29udGFpbmVyIT09dW5kZWZpbmVkKXttcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCl9JC5lYWNoKF9zZWxlY3Rpb24sZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3ZhciBzZWxlY3RlZEl0ZW1FbCxkZWxJdGVtRWwsc2VsZWN0ZWRJdGVtSHRtbD1jZmcuc2VsZWN0aW9uUmVuZGVyZXIhPT1udWxsP2NmZy5zZWxlY3Rpb25SZW5kZXJlci5jYWxsKHJlZix2YWx1ZSk6dmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07dmFyIHZhbGlkQ2xzPXNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbSh2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXSk/XCJcIjpcIiBtcy1zZWwtaW52YWxpZFwiO2lmKGFzVGV4dD09PXRydWUpe3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gbXMtc2VsLXRleHQgXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWwrKGluZGV4PT09X3NlbGVjdGlvbi5sZW5ndGgtMT9cIlwiOmNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcil9KS5kYXRhKFwianNvblwiLHZhbHVlKX1lbHNle3NlbGVjdGVkSXRlbUVsPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtc2VsLWl0ZW0gXCIrY2ZnLnNlbGVjdGlvbkNscyt2YWxpZENscyxodG1sOnNlbGVjdGVkSXRlbUh0bWx9KS5kYXRhKFwianNvblwiLHZhbHVlKTtpZihjZmcuZGlzYWJsZWQ9PT1mYWxzZSl7ZGVsSXRlbUVsPSQoXCI8c3Bhbi8+XCIse1wiY2xhc3NcIjpcIm1zLWNsb3NlLWJ0blwifSkuZGF0YShcImpzb25cIix2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO2RlbEl0ZW1FbC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRhZ1RyaWdnZXJDbGljayxyZWYpKX19aXRlbXMucHVzaChzZWxlY3RlZEl0ZW1FbCl9KTttcy5zZWxlY3Rpb25Db250YWluZXIucHJlcGVuZChpdGVtcyk7bXMuX3ZhbHVlQ29udGFpbmVyPSQoXCI8ZGl2Lz5cIix7c3R5bGU6XCJkaXNwbGF5OiBub25lO1wifSk7JC5lYWNoKG1zLmdldFZhbHVlKCksZnVuY3Rpb24oaSx2YWwpe3ZhciBlbD0kKFwiPGlucHV0Lz5cIix7dHlwZTpcImhpZGRlblwiLG5hbWU6Y2ZnLm5hbWUsdmFsdWU6dmFsfSk7ZWwuYXBwZW5kVG8obXMuX3ZhbHVlQ29udGFpbmVyKX0pO21zLl92YWx1ZUNvbnRhaW5lci5hcHBlbmRUbyhtcy5zZWxlY3Rpb25Db250YWluZXIpO2lmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe21zLmlucHV0LndpZHRoKDApO2lucHV0T2Zmc2V0PW1zLmlucHV0Lm9mZnNldCgpLmxlZnQtbXMuc2VsZWN0aW9uQ29udGFpbmVyLm9mZnNldCgpLmxlZnQ7dz1tcy5jb250YWluZXIud2lkdGgoKS1pbnB1dE9mZnNldC00Mjttcy5pbnB1dC53aWR0aCh3KX1pZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXttcy5oZWxwZXIuaGlkZSgpfX0sX3NlbGVjdEl0ZW06ZnVuY3Rpb24oaXRlbSl7aWYoY2ZnLm1heFNlbGVjdGlvbj09PTEpe19zZWxlY3Rpb249W119bXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKFwianNvblwiKSk7aXRlbS5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtpZihjZmcuZXhwYW5kT25Gb2N1cz09PWZhbHNlfHxfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe21zLmNvbGxhcHNlKCl9aWYoIV9oYXNGb2N1cyl7bXMuaW5wdXQuZm9jdXMoKX1lbHNlIGlmKF9oYXNGb2N1cyYmKGNmZy5leHBhbmRPbkZvY3VzfHxfY3RybERvd24pKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtpZihfY3RybERvd24pe21zLmV4cGFuZCgpfX19LF9zb3J0QW5kVHJpbTpmdW5jdGlvbihkYXRhKXt2YXIgcT1tcy5nZXRSYXdWYWx1ZSgpLGZpbHRlcmVkPVtdLG5ld1N1Z2dlc3Rpb25zPVtdLHNlbGVjdGVkVmFsdWVzPW1zLmdldFZhbHVlKCk7aWYocS5sZW5ndGg+MCl7JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgsb2JqKXt2YXIgbmFtZT1vYmpbY2ZnLmRpc3BsYXlGaWVsZF07aWYoY2ZnLm1hdGNoQ2FzZT09PXRydWUmJm5hbWUuaW5kZXhPZihxKT4tMXx8Y2ZnLm1hdGNoQ2FzZT09PWZhbHNlJiZuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPi0xKXtpZihjZmcuc3RyaWN0U3VnZ2VzdD09PWZhbHNlfHxuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpPT09MCl7ZmlsdGVyZWQucHVzaChvYmopfX19KX1lbHNle2ZpbHRlcmVkPWRhdGF9JC5lYWNoKGZpbHRlcmVkLGZ1bmN0aW9uKGluZGV4LG9iail7aWYoY2ZnLmFsbG93RHVwbGljYXRlc3x8JC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sc2VsZWN0ZWRWYWx1ZXMpPT09LTEpe25ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKX19KTtpZihjZmcuc29ydE9yZGVyIT09bnVsbCl7bmV3U3VnZ2VzdGlvbnMuc29ydChmdW5jdGlvbihhLGIpe2lmKGFbY2ZnLnNvcnRPcmRlcl08YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8tMToxfWlmKGFbY2ZnLnNvcnRPcmRlcl0+YltjZmcuc29ydE9yZGVyXSl7cmV0dXJuIGNmZy5zb3J0RGlyPT09XCJhc2NcIj8xOi0xfXJldHVybiAwfSl9aWYoY2ZnLm1heFN1Z2dlc3Rpb25zJiZjZmcubWF4U3VnZ2VzdGlvbnM+MCl7bmV3U3VnZ2VzdGlvbnM9bmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCxjZmcubWF4U3VnZ2VzdGlvbnMpfXJldHVybiBuZXdTdWdnZXN0aW9uc30sX2dyb3VwOmZ1bmN0aW9uKGRhdGEpe2lmKGNmZy5ncm91cEJ5IT09bnVsbCl7X2dyb3Vwcz17fTskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIHByb3BzPWNmZy5ncm91cEJ5LmluZGV4T2YoXCIuXCIpPi0xP2NmZy5ncm91cEJ5LnNwbGl0KFwiLlwiKTpjZmcuZ3JvdXBCeTt2YXIgcHJvcD12YWx1ZVtjZmcuZ3JvdXBCeV07aWYodHlwZW9mIHByb3BzIT1cInN0cmluZ1wiKXtwcm9wPXZhbHVlO3doaWxlKHByb3BzLmxlbmd0aD4wKXtwcm9wPXByb3BbcHJvcHMuc2hpZnQoKV19fWlmKF9ncm91cHNbcHJvcF09PT11bmRlZmluZWQpe19ncm91cHNbcHJvcF09e3RpdGxlOnByb3AsaXRlbXM6W3ZhbHVlXX19ZWxzZXtfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpfX0pfXJldHVybiBkYXRhfSxfdXBkYXRlSGVscGVyOmZ1bmN0aW9uKGh0bWwpe21zLmhlbHBlci5odG1sKGh0bWwpO2lmKCFtcy5oZWxwZXIuaXMoXCI6dmlzaWJsZVwiKSl7bXMuaGVscGVyLmZhZGVJbigpfX0sX3ZhbGlkYXRlU2luZ2xlSXRlbTpmdW5jdGlvbih2YWx1ZSl7aWYoY2ZnLnZyZWdleCE9PW51bGwmJmNmZy52cmVnZXggaW5zdGFuY2VvZiBSZWdFeHApe3JldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpfWVsc2UgaWYoY2ZnLnZ0eXBlIT09bnVsbCl7c3dpdGNoKGNmZy52dHlwZSl7Y2FzZVwiYWxwaGFcIjpyZXR1cm4vXlthLXpBLVpfXSskLy50ZXN0KHZhbHVlKTtjYXNlXCJhbHBoYW51bVwiOnJldHVybi9eW2EtekEtWjAtOV9dKyQvLnRlc3QodmFsdWUpO2Nhc2VcImVtYWlsXCI6cmV0dXJuL14oXFx3KykoW1xcLSsuXVtcXHddKykqQChcXHdbXFwtXFx3XSpcXC4pezEsNX0oW0EtWmEtel0pezIsNn0kLy50ZXN0KHZhbHVlKTtjYXNlXCJ1cmxcIjpyZXR1cm4vKCgoXmh0dHBzPyl8KF5mdHApKTpcXC9cXC8oW1xcLVxcd10rXFwuKStcXHd7MiwzfShcXC9bJVxcLVxcd10rKFxcLlxcd3syLH0pPykqKChbXFx3XFwtXFwuXFw/XFxcXFxcLytAJiM7YH49JSFdKikoXFwuXFx3ezIsfSk/KSpcXC8/KS9pLnRlc3QodmFsdWUpO2Nhc2VcImlwYWRkcmVzc1wiOnJldHVybi9eXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30kLy50ZXN0KHZhbHVlKX19cmV0dXJuIHRydWV9fTt2YXIgaGFuZGxlcnM9e19vbkJsdXI6ZnVuY3Rpb24oKXttcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29sbGFwc2UoKTtfaGFzRm9jdXM9ZmFsc2U7aWYobXMuZ2V0UmF3VmFsdWUoKSE9PVwiXCImJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09dHJ1ZSl7dmFyIG9iaj17fTtvYmpbY2ZnLmRpc3BsYXlGaWVsZF09b2JqW2NmZy52YWx1ZUZpZWxkXT1tcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTttcy5hZGRUb1NlbGVjdGlvbihvYmopfXNlbGYuX3JlbmRlclNlbGVjdGlvbigpO2lmKG1zLmlzVmFsaWQoKT09PWZhbHNlKXttcy5jb250YWluZXIuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpfWVsc2UgaWYobXMuaW5wdXQudmFsKCkhPT1cIlwiJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PWZhbHNlKXttcy5lbXB0eSgpO3NlbGYuX3VwZGF0ZUhlbHBlcihcIlwiKX0kKG1zKS50cmlnZ2VyKFwiYmx1clwiLFttc10pfSxfb25Db21ib0l0ZW1Nb3VzZU92ZXI6ZnVuY3Rpb24oZSl7dmFyIHRhcmdldD0kKGUuY3VycmVudFRhcmdldCk7aWYoIXRhcmdldC5oYXNDbGFzcyhcIm1zLXJlcy1pdGVtLWRpc2FibGVkXCIpKXttcy5jb21ib2JveC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO3RhcmdldC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX19LF9vbkNvbWJvSXRlbVNlbGVjdGVkOmZ1bmN0aW9uKGUpe3ZhciB0YXJnZXQ9JChlLmN1cnJlbnRUYXJnZXQpO2lmKCF0YXJnZXQuaGFzQ2xhc3MoXCJtcy1yZXMtaXRlbS1kaXNhYmxlZFwiKSl7c2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpfX0sX29uRm9jdXM6ZnVuY3Rpb24oKXttcy5pbnB1dC5mb2N1cygpfSxfb25JbnB1dENsaWNrOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJl9oYXNGb2N1cyl7aWYoY2ZnLnRvZ2dsZU9uQ2xpY2s9PT10cnVlKXtpZihjZmcuZXhwYW5kZWQpe21zLmNvbGxhcHNlKCl9ZWxzZXttcy5leHBhbmQoKX19fX0sX29uSW5wdXRGb2N1czpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiYhX2hhc0ZvY3VzKXtfaGFzRm9jdXM9dHJ1ZTttcy5jb250YWluZXIuYWRkQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIik7bXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTt2YXIgY3VyTGVuZ3RoPW1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO2lmKGNmZy5leHBhbmRPbkZvY3VzPT09dHJ1ZSl7bXMuZXhwYW5kKCl9aWYoX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcyxfc2VsZWN0aW9uLmxlbmd0aCkpfWVsc2UgaWYoY3VyTGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtY3VyTGVuZ3RoKSl9c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcImZvY3VzXCIsW21zXSl9fSxfb25LZXlEb3duOmZ1bmN0aW9uKGUpe3ZhciBhY3RpdmU9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIiksZnJlZUlucHV0PW1zLmlucHV0LnZhbCgpOyQobXMpLnRyaWdnZXIoXCJrZXlkb3duXCIsW21zLGVdKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5UQUImJihjZmcudXNlVGFiS2V5PT09ZmFsc2V8fGNmZy51c2VUYWJLZXk9PT10cnVlJiZhY3RpdmUubGVuZ3RoPT09MCYmbXMuaW5wdXQudmFsKCkubGVuZ3RoPT09MCkpe2hhbmRsZXJzLl9vbkJsdXIoKTtyZXR1cm59c3dpdGNoKGUua2V5Q29kZSl7Y2FzZSBLRVlDT0RFUy5CQUNLU1BBQ0U6aWYoZnJlZUlucHV0Lmxlbmd0aD09PTAmJm1zLmdldFNlbGVjdGlvbigpLmxlbmd0aD4wJiZjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCIpe19zZWxlY3Rpb24ucG9wKCk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7JChtcykudHJpZ2dlcihcInNlbGVjdGlvbmNoYW5nZVwiLFttcyxtcy5nZXRTZWxlY3Rpb24oKV0pO21zLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmbXMuZ2V0VmFsdWUoKS5sZW5ndGg+MD9cIlwiOmNmZy5wbGFjZWhvbGRlcik7bXMuaW5wdXQuZm9jdXMoKTtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5FU0M6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6aWYoZnJlZUlucHV0IT09XCJcInx8Y2ZnLmV4cGFuZGVkKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DT01NQTppZihjZmcudXNlQ29tbWFLZXk9PT10cnVlKXtlLnByZXZlbnREZWZhdWx0KCl9YnJlYWs7Y2FzZSBLRVlDT0RFUy5DVFJMOl9jdHJsRG93bj10cnVlO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOmUucHJldmVudERlZmF1bHQoKTtzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJkb3duXCIpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuVVBBUlJPVzplLnByZXZlbnREZWZhdWx0KCk7c2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7YnJlYWs7ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe2UucHJldmVudERlZmF1bHQoKX1icmVha319LF9vbktleVVwOmZ1bmN0aW9uKGUpe3ZhciBmcmVlSW5wdXQ9bXMuZ2V0UmF3VmFsdWUoKSxpbnB1dFZhbGlkPSQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoPjAmJighY2ZnLm1heEVudHJ5TGVuZ3RofHwkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aDw9Y2ZnLm1heEVudHJ5TGVuZ3RoKSxzZWxlY3RlZCxvYmo9e307JChtcykudHJpZ2dlcihcImtleXVwXCIsW21zLGVdKTtjbGVhclRpbWVvdXQoX3RpbWVyKTtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5FU0MmJmNmZy5leHBhbmRlZCl7bXMuY29tYm9ib3guaGlkZSgpfWlmKGUua2V5Q29kZT09PUtFWUNPREVTLlRBQiYmY2ZnLnVzZVRhYktleT09PWZhbHNlfHxlLmtleUNvZGU+S0VZQ09ERVMuRU5URVImJmUua2V5Q29kZTxLRVlDT0RFUy5TUEFDRSl7aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuQ1RSTCl7X2N0cmxEb3duPWZhbHNlfXJldHVybn1zd2l0Y2goZS5rZXlDb2RlKXtjYXNlIEtFWUNPREVTLlVQQVJST1c6Y2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO2JyZWFrO2Nhc2UgS0VZQ09ERVMuRU5URVI6Y2FzZSBLRVlDT0RFUy5UQUI6Y2FzZSBLRVlDT0RFUy5DT01NQTppZihlLmtleUNvZGUhPT1LRVlDT0RFUy5DT01NQXx8Y2ZnLnVzZUNvbW1hS2V5PT09dHJ1ZSl7ZS5wcmV2ZW50RGVmYXVsdCgpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe3NlbGVjdGVkPW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0XCIpO2lmKHNlbGVjdGVkLmxlbmd0aD4wKXtzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtyZXR1cm59fWlmKGlucHV0VmFsaWQ9PT10cnVlJiZjZmcuYWxsb3dGcmVlRW50cmllcz09PXRydWUpe29ialtjZmcuZGlzcGxheUZpZWxkXT1vYmpbY2ZnLnZhbHVlRmllbGRdPWZyZWVJbnB1dC50cmltKCk7bXMuYWRkVG9TZWxlY3Rpb24ob2JqKTttcy5jb2xsYXBzZSgpO21zLmlucHV0LmZvY3VzKCl9YnJlYWt9ZGVmYXVsdDppZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZXtpZihmcmVlSW5wdXQubGVuZ3RoPGNmZy5taW5DaGFycyl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtZnJlZUlucHV0Lmxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2UgaWYoY2ZnLm1heEVudHJ5TGVuZ3RoJiZmcmVlSW5wdXQubGVuZ3RoPmNmZy5tYXhFbnRyeUxlbmd0aCl7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhFbnRyeVJlbmRlcmVyLmNhbGwodGhpcyxmcmVlSW5wdXQubGVuZ3RoLWNmZy5tYXhFbnRyeUxlbmd0aCkpO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9fWVsc2V7bXMuaGVscGVyLmhpZGUoKTtpZihjZmcubWluQ2hhcnM8PWZyZWVJbnB1dC5sZW5ndGgpe190aW1lcj1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9ZWxzZXttcy5leHBhbmQoKX19LGNmZy50eXBlRGVsYXkpfX19YnJlYWt9fSxfb25UYWdUcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oZSl7bXMucmVtb3ZlRnJvbVNlbGVjdGlvbigkKGUuY3VycmVudFRhcmdldCkuZGF0YShcImpzb25cIikpfSxfb25UcmlnZ2VyQ2xpY2s6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmIShjZmcuZXhwYW5kT25Gb2N1cz09PXRydWUmJl9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbikpeyQobXMpLnRyaWdnZXIoXCJ0cmlnZ2VyY2xpY2tcIixbbXNdKTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXttcy5jb2xsYXBzZSgpfWVsc2V7dmFyIGN1ckxlbmd0aD1tcy5nZXRSYXdWYWx1ZSgpLmxlbmd0aDtpZihjdXJMZW5ndGg+PWNmZy5taW5DaGFycyl7bXMuaW5wdXQuZm9jdXMoKTttcy5leHBhbmQoKX1lbHNle3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsY2ZnLm1pbkNoYXJzLWN1ckxlbmd0aCkpfX19fSxfb25XaW5kb3dSZXNpemVkOmZ1bmN0aW9uKCl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCl9fTtpZihlbGVtZW50IT09bnVsbCl7c2VsZi5fcmVuZGVyKGVsZW1lbnQpfX07JC5mbi5tYWdpY1N1Z2dlc3Q9ZnVuY3Rpb24ob3B0aW9ucyl7dmFyIG9iaj0kKHRoaXMpO2lmKG9iai5zaXplKCk9PT0xJiZvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKSl7cmV0dXJuIG9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpfW9iai5lYWNoKGZ1bmN0aW9uKGkpe3ZhciBjbnRyPSQodGhpcyk7aWYoY250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIpKXtyZXR1cm59aWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJzZWxlY3RcIil7b3B0aW9ucy5kYXRhPVtdO29wdGlvbnMudmFsdWU9W107JC5lYWNoKHRoaXMuY2hpbGRyZW4sZnVuY3Rpb24oaW5kZXgsY2hpbGQpe2lmKGNoaWxkLm5vZGVOYW1lJiZjaGlsZC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09XCJvcHRpb25cIil7b3B0aW9ucy5kYXRhLnB1c2goe2lkOmNoaWxkLnZhbHVlLG5hbWU6Y2hpbGQudGV4dH0pO2lmKCQoY2hpbGQpLmF0dHIoXCJzZWxlY3RlZFwiKSl7b3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKX19fSl9dmFyIGRlZj17fTskLmVhY2godGhpcy5hdHRyaWJ1dGVzLGZ1bmN0aW9uKGksYXR0KXtkZWZbYXR0Lm5hbWVdPWF0dC5uYW1lPT09XCJ2YWx1ZVwiJiZhdHQudmFsdWUhPT1cIlwiP0pTT04ucGFyc2UoYXR0LnZhbHVlKTphdHQudmFsdWV9KTt2YXIgZmllbGQ9bmV3IE1hZ2ljU3VnZ2VzdCh0aGlzLCQuZXh0ZW5kKFtdLCQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLG9wdGlvbnMsZGVmKSk7Y250ci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpO2ZpZWxkLmNvbnRhaW5lci5kYXRhKFwibWFnaWNTdWdnZXN0XCIsZmllbGQpfSk7aWYob2JqLnNpemUoKT09PTEpe3JldHVybiBvYmouZGF0YShcIm1hZ2ljU3VnZ2VzdFwiKX1yZXR1cm4gb2JqfTskLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cz17fX0pKGpRdWVyeSk7IiwiLyoqXG4gKiBNdWx0aXBsZSBTZWxlY3Rpb24gQ29tcG9uZW50IGZvciBCb290c3RyYXBcbiAqIENoZWNrIG5pY29sYXNiaXplLmdpdGh1Yi5pby9tYWdpY3N1Z2dlc3QvIGZvciBsYXRlc3QgdXBkYXRlcy5cbiAqXG4gKiBBdXRob3I6ICAgICAgIE5pY29sYXMgQml6ZVxuICogQ3JlYXRlZDogICAgICBGZWIgOHRoIDIwMTNcbiAqIExhc3QgVXBkYXRlZDogT2N0IDE2dGggMjAxNFxuICogVmVyc2lvbjogICAgICAyLjEuNFxuICogTGljZW5jZTogICAgICBNYWdpY1N1Z2dlc3QgaXMgbGljZW5jZWQgdW5kZXIgTUlUIGxpY2VuY2UgKGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQpXG4gKi9cbihmdW5jdGlvbigkKVxue1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBNYWdpY1N1Z2dlc3QgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKVxuICAgIHtcbiAgICAgICAgdmFyIG1zID0gdGhpcztcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5pdGlhbGl6ZXMgdGhlIE1hZ2ljU3VnZ2VzdCBjb21wb25lbnRcbiAgICAgICAgICovXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIC8qKioqKioqKioqICBDT05GSUdVUkFUSU9OIFBST1BFUlRJRVMgKioqKioqKioqKioqL1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXN0cmljdHMgb3IgYWxsb3dzIHRoZSB1c2VyIHRvIHZhbGlkYXRlIHR5cGVkIGVudHJpZXMuXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhbGxvd0ZyZWVFbnRyaWVzOiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlc3RyaWN0cyBvciBhbGxvd3MgdGhlIHVzZXIgdG8gYWRkIHRoZSBzYW1lIGVudHJ5IG1vcmUgdGhhbiBvbmNlXG4gICAgICAgICAgICAgKiBEZWZhdWx0cyB0byBmYWxzZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWxsb3dEdXBsaWNhdGVzOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIGNvbmZpZyBvYmplY3QgcGFzc2VkIHRvIGVhY2ggJC5hamF4IGNhbGxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWpheENvbmZpZzoge30sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgYSBzaW5nbGUgc3VnZ2VzdGlvbiBjb21lcyBvdXQsIGl0IGlzIHByZXNlbGVjdGVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhdXRvU2VsZWN0OiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEF1dG8gc2VsZWN0IHRoZSBmaXJzdCBtYXRjaGluZyBpdGVtIHdpdGggbXVsdGlwbGUgaXRlbXMgc2hvd25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0Rmlyc3Q6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFsbG93IGN1c3RvbWl6YXRpb24gb2YgcXVlcnkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHF1ZXJ5UGFyYW06ICdxdWVyeScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0cmlnZ2VyZWQganVzdCBiZWZvcmUgdGhlIGFqYXggcmVxdWVzdCBpcyBzZW50LCBzaW1pbGFyIHRvIGpRdWVyeVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBiZWZvcmVTZW5kOiBmdW5jdGlvbigpeyB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIENTUyBjbGFzcyB0byBhcHBseSB0byB0aGUgZmllbGQncyB1bmRlcmx5aW5nIGVsZW1lbnQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSlNPTiBEYXRhIHNvdXJjZSB1c2VkIHRvIHBvcHVsYXRlIHRoZSBjb21ibyBib3guIDMgb3B0aW9ucyBhcmUgYXZhaWxhYmxlIGhlcmU6XG4gICAgICAgICAgICAgKiBObyBEYXRhIFNvdXJjZSAoZGVmYXVsdClcbiAgICAgICAgICAgICAqICAgIFdoZW4gbGVmdCBudWxsLCB0aGUgY29tYm8gYm94IHdpbGwgbm90IHN1Z2dlc3QgYW55dGhpbmcuIEl0IGNhbiBzdGlsbCBlbmFibGUgdGhlIHVzZXIgdG8gZW50ZXJcbiAgICAgICAgICAgICAqICAgIG11bHRpcGxlIGVudHJpZXMgaWYgYWxsb3dGcmVlRW50cmllcyBpcyAqIHNldCB0byB0cnVlIChkZWZhdWx0KS5cbiAgICAgICAgICAgICAqIFN0YXRpYyBTb3VyY2VcbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gcGFzcyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMsIGFuIGFycmF5IG9mIHN0cmluZ3Mgb3IgZXZlbiBhIHNpbmdsZSBDU1Ygc3RyaW5nIGFzIHRoZVxuICAgICAgICAgICAgICogICAgZGF0YSBzb3VyY2UuRm9yIGV4LiBkYXRhOiBbKiB7aWQ6MCxuYW1lOlwiUGFyaXNcIn0sIHtpZDogMSwgbmFtZTogXCJOZXcgWW9ya1wifV1cbiAgICAgICAgICAgICAqICAgIFlvdSBjYW4gYWxzbyBwYXNzIGFueSBqc29uIG9iamVjdCB3aXRoIHRoZSByZXN1bHRzIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGpzb24gYXJyYXkuXG4gICAgICAgICAgICAgKiBVcmxcbiAgICAgICAgICAgICAqICAgICBZb3UgY2FuIHBhc3MgdGhlIHVybCBmcm9tIHdoaWNoIHRoZSBjb21wb25lbnQgd2lsbCBmZXRjaCBpdHMgSlNPTiBkYXRhLkRhdGEgd2lsbCBiZSBmZXRjaGVkXG4gICAgICAgICAgICAgKiAgICAgdXNpbmcgYSBQT1NUIGFqYXggcmVxdWVzdCB0aGF0IHdpbGwgKiBpbmNsdWRlIHRoZSBlbnRlcmVkIHRleHQgYXMgJ3F1ZXJ5JyBwYXJhbWV0ZXIuIFRoZSByZXN1bHRzXG4gICAgICAgICAgICAgKiAgICAgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIgY2FuIGJlOlxuICAgICAgICAgICAgICogICAgIC0gYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcbiAgICAgICAgICAgICAqICAgICAtIGEgc3RyaW5nIGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIHJlYWR5IHRvIGJlIHBhcnNlZCAoZXg6IFwiW3tpZDouLi4sbmFtZTouLi59LHsuLi59XVwiKVxuICAgICAgICAgICAgICogICAgIC0gYSBKU09OIG9iamVjdCB3aG9zZSBkYXRhIHdpbGwgYmUgY29udGFpbmVkIGluIHRoZSByZXN1bHRzIHByb3BlcnR5XG4gICAgICAgICAgICAgKiAgICAgIChleDoge3Jlc3VsdHM6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV1cbiAgICAgICAgICAgICAqIEZ1bmN0aW9uXG4gICAgICAgICAgICAgKiAgICAgWW91IGNhbiBwYXNzIGEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcbiAgICAgICAgICAgICAqICAgICBUaGUgZnVuY3Rpb24gY2FuIHJldHVybiB0aGUgSlNPTiBkYXRhIG9yIGl0IGNhbiB1c2UgdGhlIGZpcnN0IGFyZ3VtZW50IGFzIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgZGF0YS5cbiAgICAgICAgICAgICAqICAgICBPbmx5IG9uZSAoY2FsbGJhY2sgZnVuY3Rpb24gb3IgcmV0dXJuIHZhbHVlKSBpcyBuZWVkZWQgZm9yIHRoZSBmdW5jdGlvbiB0byBzdWNjZWVkLlxuICAgICAgICAgICAgICogICAgIFNlZSB0aGUgZm9sbG93aW5nIGV4YW1wbGU6XG4gICAgICAgICAgICAgKiAgICAgZnVuY3Rpb24gKHJlc3BvbnNlKSB7IHZhciBteWpzb24gPSBbe25hbWU6ICd0ZXN0JywgaWQ6IDF9XTsgcmVzcG9uc2UobXlqc29uKTsgcmV0dXJuIG15anNvbjsgfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyB0byB0aGUgYWpheCBjYWxsXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRhdGFVcmxQYXJhbXM6IHt9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFN0YXJ0IHRoZSBjb21wb25lbnQgaW4gYSBkaXNhYmxlZCBzdGF0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCBkZWZpbmVzIHRoZSBkaXNhYmxlZCBiZWhhdmlvdXJcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGlzYWJsZWRGaWVsZDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBOYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGRpc3BsYXllZCBpbiB0aGUgY29tYm8gbGlzdFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBkaXNwbGF5RmllbGQ6ICduYW1lJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gZmFsc2UgaWYgeW91IG9ubHkgd2FudCBtb3VzZSBpbnRlcmFjdGlvbi4gSW4gdGhhdCBjYXNlIHRoZSBjb21ibyB3aWxsXG4gICAgICAgICAgICAgKiBhdXRvbWF0aWNhbGx5IGV4cGFuZCBvbiBmb2N1cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZWRpdGFibGU6IHRydWUsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHN0YXJ0aW5nIHN0YXRlIGZvciBjb21iby5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXhwYW5kZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEF1dG9tYXRpY2FsbHkgZXhwYW5kcyBjb21ibyBvbiBmb2N1cy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZXhwYW5kT25Gb2N1czogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSlNPTiBwcm9wZXJ0eSBieSB3aGljaCB0aGUgbGlzdCBzaG91bGQgYmUgZ3JvdXBlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBncm91cEJ5OiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGhpZGUgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGhpZGVUcmlnZ2VyOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBoaWdobGlnaHQgc2VhcmNoIGlucHV0IHdpdGhpbiBkaXNwbGF5ZWQgc3VnZ2VzdGlvbnNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIElEIGZvciB0aGlzIGNvbXBvbmVudFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpZDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGNsYXNzIHRoYXQgaXMgYWRkZWQgdG8gdGhlIGluZm8gbWVzc2FnZSBhcHBlYXJpbmcgb24gdGhlIHRvcC1yaWdodCBwYXJ0IG9mIHRoZSBjb21wb25lbnRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5mb01zZ0NsczogJycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHBhc3NlZCBvdXQgdG8gdGhlIElOUFVUIHRhZy4gRW5hYmxlcyB1c2FnZSBvZiBBbmd1bGFySlMncyBjdXN0b20gdGFncyBmb3IgZXguXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlucHV0Q2ZnOiB7fSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgY2xhc3MgdGhhdCBpcyBhcHBsaWVkIHRvIHNob3cgdGhhdCB0aGUgZmllbGQgaXMgaW52YWxpZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpbnZhbGlkQ2xzOiAnbXMtaW52JyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBmaWx0ZXIgZGF0YSByZXN1bHRzIGFjY29yZGluZyB0byBjYXNlLiBVc2VsZXNzIGlmIHRoZSBkYXRhIGlzIGZldGNoZWQgcmVtb3RlbHlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF0Y2hDYXNlOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBPbmNlIGV4cGFuZGVkLCB0aGUgY29tYm8ncyBoZWlnaHQgd2lsbCB0YWtlIGFzIG11Y2ggcm9vbSBhcyB0aGUgIyBvZiBhdmFpbGFibGUgcmVzdWx0cy5cbiAgICAgICAgICAgICAqICAgIEluIGNhc2UgdGhlcmUgYXJlIHRvbyBtYW55IHJlc3VsdHMgZGlzcGxheWVkLCB0aGlzIHdpbGwgZml4IHRoZSBkcm9wIGRvd24gaGVpZ2h0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhEcm9wSGVpZ2h0OiAyOTAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVmaW5lcyBob3cgbG9uZyB0aGUgdXNlciBmcmVlIGVudHJ5IGNhbiBiZS4gU2V0IHRvIG51bGwgZm9yIG5vIGxpbWl0LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtYXhFbnRyeUxlbmd0aDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IGVudHJ5IGxlbmd0aCBoYXMgYmVlbiBzdXJwYXNzZWQuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heEVudHJ5UmVuZGVyZXI6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1BsZWFzZSByZWR1Y2UgeW91ciBlbnRyeSBieSAnICsgdiArICcgY2hhcmFjdGVyJyArICh2ID4gMSA/ICdzJzonJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiByZXN1bHRzIGRpc3BsYXllZCBpbiB0aGUgY29tYm8gZHJvcCBkb3duIGF0IG9uY2UuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFN1Z2dlc3Rpb25zOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0aGUgdXNlciBjYW4gc2VsZWN0IGlmIG11bHRpcGxlIHNlbGVjdGlvbiBpcyBhbGxvd2VkLlxuICAgICAgICAgICAgICogICAgU2V0IHRvIG51bGwgdG8gcmVtb3ZlIHRoZSBsaW1pdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWF4U2VsZWN0aW9uOiAxMCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyB0aGUgaGVscGVyIHRleHQgd2hlbiB0aGUgbWF4IHNlbGVjdGlvbiBhbW91bnQgaGFzIGJlZW4gcmVhY2hlZC4gVGhlIGZ1bmN0aW9uIGhhcyBhIHNpbmdsZVxuICAgICAgICAgICAgICogICAgcGFyYW1ldGVyIHdoaWNoIGlzIHRoZSBudW1iZXIgb2Ygc2VsZWN0ZWQgZWxlbWVudHMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1heFNlbGVjdGlvblJlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gJyArIHYgKyAnIGl0ZW0nICsgKHYgPiAxID8gJ3MnOicnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG1ldGhvZCB1c2VkIGJ5IHRoZSBhamF4IHJlcXVlc3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBtaW5pbXVtIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRoZSB1c2VyIG11c3QgdHlwZSBiZWZvcmUgdGhlIGNvbWJvIGV4cGFuZHMgYW5kIG9mZmVycyBzdWdnZXN0aW9ucy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbWluQ2hhcnM6IDAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gbm90IGVub3VnaCBsZXR0ZXJzIGFyZSBzZXQuIFRoZSBmdW5jdGlvbiBoYXMgYSBzaW5nbGVcbiAgICAgICAgICAgICAqICAgIHBhcmFtZXRlciB3aGljaCBpcyB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSByZXF1aXJlZCBhbW91bnQgb2YgbGV0dGVycyBhbmQgdGhlIGN1cnJlbnQgb25lLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaW5DaGFyc1JlbmRlcmVyOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdQbGVhc2UgdHlwZSAnICsgdiArICcgbW9yZSBjaGFyYWN0ZXInICsgKHYgPiAxID8gJ3MnOicnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogV2hldGhlciBvciBub3Qgc29ydGluZyAvIGZpbHRlcmluZyBzaG91bGQgYmUgZG9uZSByZW1vdGVseSBvciBsb2NhbGx5LlxuICAgICAgICAgICAgICogVXNlIGVpdGhlciAnbG9jYWwnIG9yICdyZW1vdGUnXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG1vZGU6ICdsb2NhbCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIG5hbWUgdXNlZCBhcyBhIGZvcm0gZWxlbWVudC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgbmFtZTogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgdGV4dCBkaXNwbGF5ZWQgd2hlbiB0aGVyZSBhcmUgbm8gc3VnZ2VzdGlvbnMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG5vU3VnZ2VzdGlvblRleHQ6ICdObyBzdWdnZXN0aW9ucycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVGhlIGRlZmF1bHQgcGxhY2Vob2xkZXIgdGV4dCB3aGVuIG5vdGhpbmcgaGFzIGJlZW4gZW50ZXJlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogJ1R5cGUgb3IgY2xpY2sgaGVyZScsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB1c2VkIHRvIGRlZmluZSBob3cgdGhlIGl0ZW1zIHdpbGwgYmUgcHJlc2VudGVkIGluIHRoZSBjb21ib1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZW5kZXJlcjogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGlzIGZpZWxkIHNob3VsZCBiZSByZXF1aXJlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gcmVuZGVyIHNlbGVjdGlvbiBhcyBhIGRlbGltaXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVzdWx0QXNTdHJpbmc6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRleHQgZGVsaW1pdGVyIHRvIHVzZSBpbiBhIGRlbGltaXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOiAnLCcsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgdGhlIGxpc3Qgb2Ygc3VnZ2VzdGVkIG9iamVjdHNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVzdWx0c0ZpZWxkOiAncmVzdWx0cycsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQSBjdXN0b20gQ1NTIGNsYXNzIHRvIGFkZCB0byBhIHNlbGVjdGVkIGl0ZW1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uQ2xzOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbiBvcHRpb25hbCBlbGVtZW50IHJlcGxhY2VtZW50IGluIHdoaWNoIHRoZSBzZWxlY3Rpb24gaXMgcmVuZGVyZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uQ29udGFpbmVyOiBudWxsLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFdoZXJlIHRoZSBzZWxlY3RlZCBpdGVtcyB3aWxsIGJlIGRpc3BsYXllZC4gT25seSAncmlnaHQnLCAnYm90dG9tJyBhbmQgJ2lubmVyJyBhcmUgdmFsaWQgdmFsdWVzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblBvc2l0aW9uOiAnaW5uZXInLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdXNlZCB0byBkZWZpbmUgaG93IHRoZSBpdGVtcyB3aWxsIGJlIHByZXNlbnRlZCBpbiB0aGUgdGFnIGxpc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2VsZWN0aW9uUmVuZGVyZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gc3RhY2sgdGhlIHNlbGVjdGlvbmVkIGl0ZW1zIHdoZW4gcG9zaXRpb25lZCBvbiB0aGUgYm90dG9tXG4gICAgICAgICAgICAgKiAgICBSZXF1aXJlcyB0aGUgc2VsZWN0aW9uUG9zaXRpb24gdG8gYmUgc2V0IHRvICdib3R0b20nXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNlbGVjdGlvblN0YWNrZWQ6IGZhbHNlLFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERpcmVjdGlvbiB1c2VkIGZvciBzb3J0aW5nLiBPbmx5ICdhc2MnIGFuZCAnZGVzYycgYXJlIHZhbGlkIHZhbHVlc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzb3J0RGlyOiAnYXNjJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBuYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGZvciBsb2NhbCByZXN1bHQgc29ydGluZy5cbiAgICAgICAgICAgICAqICAgIExlYXZlIG51bGwgaWYgeW91IGRvIG5vdCB3aXNoIHRoZSByZXN1bHRzIHRvIGJlIG9yZGVyZWQgb3IgaWYgdGhleSBhcmUgYWxyZWFkeSBvcmRlcmVkIHJlbW90ZWx5LlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzb3J0T3JkZXI6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHN1Z2dlc3Rpb25zIHdpbGwgaGF2ZSB0byBzdGFydCBieSB1c2VyIGlucHV0IChhbmQgbm90IHNpbXBseSBjb250YWluIGl0IGFzIGEgc3Vic3RyaW5nKVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzdHJpY3RTdWdnZXN0OiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDdXN0b20gc3R5bGUgYWRkZWQgdG8gdGhlIGNvbXBvbmVudCBjb250YWluZXIuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHN0eWxlOiAnJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGNvbWJvIHdpbGwgZXhwYW5kIC8gY29sbGFwc2Ugd2hlbiBjbGlja2VkIHVwb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdG9nZ2xlT25DbGljazogZmFsc2UsXG5cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBbW91bnQgKGluIG1zKSBiZXR3ZWVuIGtleWJvYXJkIHJlZ2lzdGVycy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdHlwZURlbGF5OiA0MDAsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHRhYiB3b24ndCBibHVyIHRoZSBjb21wb25lbnQgYnV0IHdpbGwgYmUgcmVnaXN0ZXJlZCBhcyB0aGUgRU5URVIga2V5XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHVzZVRhYktleTogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHVzaW5nIGNvbW1hIHdpbGwgdmFsaWRhdGUgdGhlIHVzZXIncyBjaG9pY2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdXNlQ29tbWFLZXk6IHRydWUsXG5cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRoZSByZXN1bHRzIHdpbGwgYmUgZGlzcGxheWVkIHdpdGggYSB6ZWJyYSB0YWJsZSBzdHlsZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB1c2VaZWJyYVN0eWxlOiBmYWxzZSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBpbml0aWFsIHZhbHVlIGZvciB0aGUgZmllbGRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFsdWU6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogbmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgaXRzIHVuZGVybHlpbmcgdmFsdWVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFsdWVGaWVsZDogJ2lkJyxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiByZWd1bGFyIGV4cHJlc3Npb24gdG8gdmFsaWRhdGUgdGhlIHZhbHVlcyBhZ2FpbnN0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZyZWdleDogbnVsbCxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiB0eXBlIHRvIHZhbGlkYXRlIGFnYWluc3RcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdnR5cGU6IG51bGxcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY29uZiA9ICQuZXh0ZW5kKHt9LG9wdGlvbnMpO1xuICAgICAgICB2YXIgY2ZnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25mKTtcblxuICAgICAgICAvKioqKioqKioqKiAgUFVCTElDIE1FVEhPRFMgKioqKioqKioqKioqL1xuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIG9uZSBvciBtdWx0aXBsZSBqc29uIGl0ZW1zIHRvIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zLCBpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCFjZmcubWF4U2VsZWN0aW9uIHx8IF9zZWxlY3Rpb24ubGVuZ3RoIDwgY2ZnLm1heFNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgIGlmICghJC5pc0FycmF5KGl0ZW1zKSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZWNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYWxsb3dEdXBsaWNhdGVzIHx8ICQuaW5BcnJheShqc29uW2NmZy52YWx1ZUZpZWxkXSwgbXMuZ2V0VmFsdWUoKSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnB1c2goanNvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZWNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1NpbGVudCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdzZWxlY3Rpb25jaGFuZ2UnLCBbdGhpcywgdGhpcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICAgICAqIEBwYXJhbSBpc1NpbGVudCAtIChvcHRpb25hbCkgc2V0IHRvIHRydWUgdG8gc3VwcHJlc3MgJ3NlbGVjdGlvbmNoYW5nZScgZXZlbnQgZnJvbSBiZWluZyB0cmlnZ2VyZWRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY2xlYXIgPSBmdW5jdGlvbihpc1NpbGVudClcbiAgICAgICAge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uKF9zZWxlY3Rpb24uc2xpY2UoMCksIGlzU2lsZW50KTsgLy8gY2xvbmUgYXJyYXkgdG8gYXZvaWQgY29uY3VycmVuY3kgaXNzdWVzXG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbGxhcHNlIHRoZSBkcm9wIGRvd24gcGFydCBvZiB0aGUgY29tYm9cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGFwc2UgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWJvYm94LmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignY29sbGFwc2UnLCBbdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgdGhlIGNvbXBvbmVudCBpbiBhIGRpc2FibGVkIHN0YXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5kaXNhYmxlID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWRpc2FibGVkJyk7XG4gICAgICAgICAgICBjZmcuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW1wdGllcyBvdXQgdGhlIGNvbWJvIHVzZXIgdGV4dFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbXB0eSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLmlucHV0LnZhbCgnJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB0aGUgY29tcG9uZW50IGluIGEgZW5hYmxlIHN0YXRlLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbmFibGUgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKCdtcy1jdG4tZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNmZy5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV4cGFuZCB0aGUgZHJvcCBkcm93biBwYXJ0IG9mIHRoZSBjb21iby5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZXhwYW5kID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIWNmZy5leHBhbmRlZCAmJiAodGhpcy5pbnB1dC52YWwoKS5sZW5ndGggPj0gY2ZnLm1pbkNoYXJzIHx8IHRoaXMuY29tYm9ib3guY2hpbGRyZW4oKS5zaXplKCkgPiAwKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tYm9ib3guYXBwZW5kVG8odGhpcy5jb250YWluZXIpO1xuICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdleHBhbmQnLCBbdGhpc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBjb21wb25lbnQgZW5hYmxlZCBzdGF0dXNcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5kaXNhYmxlZDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGZpZWxkIGlzIHZhbGlkIG9yIG5vdFxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc1ZhbGlkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdmFsaWQgPSBjZmcucmVxdWlyZWQgPT09IGZhbHNlIHx8IF9zZWxlY3Rpb24ubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGlmKGNmZy52dHlwZSB8fCBjZmcudnJlZ2V4KXtcbiAgICAgICAgICAgICAgICAkLmVhY2goX3NlbGVjdGlvbiwgZnVuY3Rpb24oaW5kZXgsIGl0ZW0pe1xuICAgICAgICAgICAgICAgICAgICB2YWxpZCA9IHZhbGlkICYmIHNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbShpdGVtW2NmZy52YWx1ZUZpZWxkXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsaWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHMgdGhlIGRhdGEgcGFyYW1zIGZvciBjdXJyZW50IGFqYXggcmVxdWVzdFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gY2ZnLmRhdGFVcmxQYXJhbXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldHMgdGhlIG5hbWUgZ2l2ZW4gdG8gdGhlIGZvcm0gaW5wdXRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0TmFtZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIGNmZy5uYW1lO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXRyaWV2ZSBhbiBhcnJheSBvZiBzZWxlY3RlZCBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHJldHVybiB7QXJyYXl9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuIF9zZWxlY3Rpb247XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIHRoZSBjdXJyZW50IHRleHQgZW50ZXJlZCBieSB0aGUgdXNlclxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRSYXdWYWx1ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gbXMuaW5wdXQudmFsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHJpZXZlIGFuIGFycmF5IG9mIHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRWYWx1ZSA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICQubWFwKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb1tjZmcudmFsdWVGaWVsZF07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIG9uZSBvciBtdWx0aXBsZXMganNvbiBpdGVtcyBmcm9tIHRoZSBjdXJyZW50IHNlbGVjdGlvblxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uID0gZnVuY3Rpb24oaXRlbXMsIGlzU2lsZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoISQuaXNBcnJheShpdGVtcykpIHtcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtpdGVtc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFsdWVjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgICAgICAkLmVhY2goaXRlbXMsIGZ1bmN0aW9uKGluZGV4LCBqc29uKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSAkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sIG1zLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYoaXNTaWxlbnQgIT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFt0aGlzLCB0aGlzLmdldFNlbGVjdGlvbigpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiB0aGlzLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldCBjdXJyZW50IGRhdGFcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gX2NiRGF0YTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IHVwIHNvbWUgY29tYm8gZGF0YSBhZnRlciBpdCBoYXMgYmVlbiByZW5kZXJlZFxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBjZmcuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2V0cyB0aGUgbmFtZSBmb3IgdGhlIGlucHV0IGZpZWxkIHNvIGl0IGNhbiBiZSBmZXRjaGVkIGluIHRoZSBmb3JtXG4gICAgICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldE5hbWUgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgICAgIGNmZy5uYW1lID0gbmFtZTtcbiAgICAgICAgICAgIGlmKG5hbWUpe1xuICAgICAgICAgICAgICAgIGNmZy5uYW1lICs9IG5hbWUuaW5kZXhPZignW10nKSA+IDAgPyAnJyA6ICdbXSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIpe1xuICAgICAgICAgICAgICAgICQuZWFjaChtcy5fdmFsdWVDb250YWluZXIuY2hpbGRyZW4oKSwgZnVuY3Rpb24oaSwgZWwpe1xuICAgICAgICAgICAgICAgICAgICBlbC5uYW1lID0gY2ZnLm5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldHMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHdpdGggdGhlIEpTT04gaXRlbXMgcHJvdmlkZWRcbiAgICAgICAgICogQHBhcmFtIGl0ZW1zXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zKXtcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGEgdmFsdWUgZm9yIHRoZSBjb21ibyBib3guIFZhbHVlIG11c3QgYmUgYW4gYXJyYXkgb2YgdmFsdWVzIHdpdGggZGF0YSB0eXBlIG1hdGNoaW5nIHZhbHVlRmllbGQgb25lLlxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlcylcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIGl0ZW1zID0gW107XG5cbiAgICAgICAgICAgICQuZWFjaCh2YWx1ZXMsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIGZpcnN0IHRyeSB0byBzZWUgaWYgd2UgaGF2ZSB0aGUgZnVsbCBvYmplY3RzIGZyb20gb3VyIGRhdGEgc2V0XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJC5lYWNoKF9jYkRhdGEsIGZ1bmN0aW9uKGksaXRlbSl7XG4gICAgICAgICAgICAgICAgICAgIGlmKGl0ZW1bY2ZnLnZhbHVlRmllbGRdID09IHZhbHVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZighZm91bmQpe1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YodmFsdWUpID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW2NmZy52YWx1ZUZpZWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbltjZmcuZGlzcGxheUZpZWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChqc29uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYoaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkVG9TZWxlY3Rpb24oaXRlbXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGRhdGEgcGFyYW1zIGZvciBzdWJzZXF1ZW50IGFqYXggcmVxdWVzdHNcbiAgICAgICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKVxuICAgICAgICB7XG4gICAgICAgICAgICBjZmcuZGF0YVVybFBhcmFtcyA9ICQuZXh0ZW5kKHt9LHBhcmFtcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqKioqKioqKiogIFBSSVZBVEUgKioqKioqKioqKioqL1xuICAgICAgICB2YXIgX3NlbGVjdGlvbiA9IFtdLCAgICAgIC8vIHNlbGVjdGVkIG9iamVjdHNcbiAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSAwLCAvLyBoZWlnaHQgZm9yIGVhY2ggY29tYm8gaXRlbS5cbiAgICAgICAgICAgIF90aW1lcixcbiAgICAgICAgICAgIF9oYXNGb2N1cyA9IGZhbHNlLFxuICAgICAgICAgICAgX2dyb3VwcyA9IG51bGwsXG4gICAgICAgICAgICBfY2JEYXRhID0gW10sXG4gICAgICAgICAgICBfY3RybERvd24gPSBmYWxzZSxcbiAgICAgICAgICAgIEtFWUNPREVTID0ge1xuICAgICAgICAgICAgICAgIEJBQ0tTUEFDRTogOCxcbiAgICAgICAgICAgICAgICBUQUI6IDksXG4gICAgICAgICAgICAgICAgRU5URVI6IDEzLFxuICAgICAgICAgICAgICAgIENUUkw6IDE3LFxuICAgICAgICAgICAgICAgIEVTQzogMjcsXG4gICAgICAgICAgICAgICAgU1BBQ0U6IDMyLFxuICAgICAgICAgICAgICAgIFVQQVJST1c6IDM4LFxuICAgICAgICAgICAgICAgIERPV05BUlJPVzogNDAsXG4gICAgICAgICAgICAgICAgQ09NTUE6IDE4OFxuICAgICAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VsZiA9IHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBFbXB0aWVzIHRoZSByZXN1bHQgY29udGFpbmVyIGFuZCByZWZpbGxzIGl0IHdpdGggdGhlIGFycmF5IG9mIGpzb24gcmVzdWx0cyBpbiBpbnB1dFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX2Rpc3BsYXlTdWdnZXN0aW9uczogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNob3coKTtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5lbXB0eSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHJlc0hlaWdodCA9IDAsIC8vIHRvdGFsIGhlaWdodCB0YWtlbiBieSBkaXNwbGF5ZWQgcmVzdWx0cy5cbiAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgPSAwO1xuXG4gICAgICAgICAgICAgICAgaWYoX2dyb3VwcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXNIZWlnaHQgPSBfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGdycE5hbWUgaW4gX2dyb3Vwcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWdyb3VwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBncnBOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhtcy5jb21ib2JveCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKF9ncm91cHNbZ3JwTmFtZV0uaXRlbXMsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBfZ3JvdXBJdGVtSGVpZ2h0ID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1ncm91cCcpLm91dGVySGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmKF9ncm91cEl0ZW1IZWlnaHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wUmVzSGVpZ2h0ID0gbmJHcm91cHMgKiBfZ3JvdXBJdGVtSGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IChfY29tYm9JdGVtSGVpZ2h0ICogZGF0YS5sZW5ndGgpICsgdG1wUmVzSGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IF9jb21ib0l0ZW1IZWlnaHQgKiAoZGF0YS5sZW5ndGggKyBuYkdyb3Vwcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihyZXNIZWlnaHQgPCBtcy5jb21ib2JveC5oZWlnaHQoKSB8fCByZXNIZWlnaHQgPD0gY2ZnLm1heERyb3BIZWlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guaGVpZ2h0KHJlc0hlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYocmVzSGVpZ2h0ID49IG1zLmNvbWJvYm94LmhlaWdodCgpICYmIHJlc0hlaWdodCA+IGNmZy5tYXhEcm9wSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhlaWdodChjZmcubWF4RHJvcEhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDEgJiYgY2ZnLmF1dG9TZWxlY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0JykuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjZmcuc2VsZWN0Rmlyc3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpLmFkZENsYXNzKCdtcy1yZXMtaXRlbS1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRSYXdWYWx1ZSgpICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBub1N1Z2dlc3Rpb25UZXh0ID0gY2ZnLm5vU3VnZ2VzdGlvblRleHQucmVwbGFjZSgvXFx7XFx7LipcXH1cXH0vLCBtcy5pbnB1dC52YWwoKSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihub1N1Z2dlc3Rpb25UZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBXaGVuIGZyZWUgZW50cnkgaXMgb2ZmLCBhZGQgaW52YWxpZCBjbGFzcyB0byBpbnB1dCBpZiBubyBkYXRhIG1hdGNoZXNcbiAgICAgICAgICAgICAgICBpZihjZmcuYWxsb3dGcmVlRW50cmllcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJChtcy5pbnB1dCkuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xuICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQobXMuaW5wdXQpLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJldHVybnMgYW4gYXJyYXkgb2YganNvbiBvYmplY3RzIGZyb20gYW4gYXJyYXkgb2Ygc3RyaW5ncy5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSBbXTtcbiAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVudHJ5ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5W2NmZy5kaXNwbGF5RmllbGRdID0gZW50cnlbY2ZnLnZhbHVlRmllbGRdID0gJC50cmltKHMpO1xuICAgICAgICAgICAgICAgICAgICBqc29uLnB1c2goZW50cnkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBqc29uO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXBsYWNlcyBodG1sIHdpdGggaGlnaGxpZ2h0ZWQgaHRtbCBhY2NvcmRpbmcgdG8gY2FzZVxuICAgICAgICAgICAgICogQHBhcmFtIGh0bWxcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9oaWdobGlnaHRTdWdnZXN0aW9uOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgICAgICAgICAgdmFyIHEgPSBtcy5pbnB1dC52YWwoKTtcblxuICAgICAgICAgICAgICAgIC8vZXNjYXBlIHNwZWNpYWwgcmVnZXggY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgIHZhciBzcGVjaWFsQ2hhcmFjdGVycyA9IFsnXicsICckJywgJyonLCAnKycsICc/JywgJy4nLCAnKCcsICcpJywgJzonLCAnIScsICd8JywgJ3snLCAnfScsICdbJywgJ10nXTtcblxuICAgICAgICAgICAgICAgICQuZWFjaChzcGVjaWFsQ2hhcmFjdGVycywgZnVuY3Rpb24gKGluZGV4LCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBxID0gcS5yZXBsYWNlKHZhbHVlLCBcIlxcXFxcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGh0bWw7IC8vIG5vdGhpbmcgZW50ZXJlZCBhcyBpbnB1dFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBnbG9iID0gY2ZnLm1hdGNoQ2FzZSA9PT0gdHJ1ZSA/ICdnJyA6ICdnaSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0bWwucmVwbGFjZShuZXcgUmVnRXhwKCcoJyArIHEgKyAnKSg/IShbXjxdKyk/PiknLCBnbG9iKSwgJzxlbT4kMTwvZW0+Jyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIE1vdmVzIHRoZSBzZWxlY3RlZCBjdXJzb3IgYW1vbmdzdCB0aGUgbGlzdCBpdGVtXG4gICAgICAgICAgICAgKiBAcGFyYW0gZGlyIC0gJ3VwJyBvciAnZG93bidcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9tb3ZlU2VsZWN0ZWRSb3c6IGZ1bmN0aW9uKGRpcikge1xuICAgICAgICAgICAgICAgIGlmKCFjZmcuZXhwYW5kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBsaXN0LCBzdGFydCwgYWN0aXZlLCBzY3JvbGxQb3M7XG4gICAgICAgICAgICAgICAgbGlzdCA9IG1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIik7XG4gICAgICAgICAgICAgICAgaWYoZGlyID09PSAnZG93bicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWN0aXZlID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpO1xuICAgICAgICAgICAgICAgIGlmKGFjdGl2ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGRpciA9PT0gJ2Rvd24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5uZXh0QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmVxKDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsUG9zID0gbXMuY29tYm9ib3guc2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydFswXS5vZmZzZXRUb3AgKyBzdGFydC5vdXRlckhlaWdodCgpID4gbXMuY29tYm9ib3guaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3Aoc2Nyb2xsUG9zICsgX2NvbWJvSXRlbUhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5wcmV2QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBsaXN0LmZpbHRlcignOmxhc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5zY3JvbGxUb3AoX2NvbWJvSXRlbUhlaWdodCAqIGxpc3QubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHN0YXJ0WzBdLm9mZnNldFRvcCA8IG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpIC0gX2NvbWJvSXRlbUhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGlzdC5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcbiAgICAgICAgICAgICAgICBzdGFydC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWNjb3JkaW5nIHRvIGdpdmVuIGRhdGEgYW5kIHF1ZXJ5LCBzb3J0IGFuZCBhZGQgc3VnZ2VzdGlvbnMgaW4gdGhlaXIgY29udGFpbmVyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcHJvY2Vzc1N1Z2dlc3Rpb25zOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIganNvbiA9IG51bGwsIGRhdGEgPSBzb3VyY2UgfHwgY2ZnLmRhdGE7XG4gICAgICAgICAgICAgICAgaWYoZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoZGF0YSkgPT09ICdmdW5jdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGRhdGEuY2FsbChtcywgbXMuZ2V0UmF3VmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEpID09PSAnc3RyaW5nJykgeyAvLyBnZXQgcmVzdWx0cyBmcm9tIGFqYXhcbiAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2JlZm9yZWxvYWQnLCBbbXNdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVBhcmFtc1tjZmcucXVlcnlQYXJhbV0gPSBtcy5pbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSAkLmV4dGVuZChxdWVyeVBhcmFtcywgY2ZnLmRhdGFVcmxQYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJC5hamF4KCQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjZmcubWV0aG9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogY2ZnLmJlZm9yZVNlbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oYXN5bmNEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbiA9IHR5cGVvZihhc3luY0RhdGEpID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UoYXN5bmNEYXRhKSA6IGFzeW5jRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKGpzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdsb2FkJywgW21zLCBqc29uXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHNlbGYuX2FzeW5jVmFsdWVzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKHR5cGVvZihzZWxmLl9hc3luY1ZhbHVlcykgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShzZWxmLl9hc3luY1ZhbHVlcykgOiBzZWxmLl9hc3luY1ZhbHVlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZShzZWxmLl9hc3luY1ZhbHVlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyhcIkNvdWxkIG5vdCByZWFjaCBzZXJ2ZXJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgY2ZnLmFqYXhDb25maWcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVzdWx0cyBmcm9tIGxvY2FsIGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA+IDAgJiYgdHlwZW9mKGRhdGFbMF0pID09PSAnc3RyaW5nJykgeyAvLyByZXN1bHRzIGZyb20gYXJyYXkgb2Ygc3RyaW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBzZWxmLl9nZXRFbnRyaWVzRnJvbVN0cmluZ0FycmF5KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVndWxhciBqc29uIGFycmF5IG9yIGpzb24gb2JqZWN0IHdpdGggcmVzdWx0cyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9jYkRhdGEgPSBkYXRhW2NmZy5yZXN1bHRzRmllbGRdIHx8IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvcnRlZERhdGEgPSBjZmcubW9kZSA9PT0gJ3JlbW90ZScgPyBfY2JEYXRhIDogc2VsZi5fc29ydEFuZFRyaW0oX2NiRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2Rpc3BsYXlTdWdnZXN0aW9ucyhzZWxmLl9ncm91cChzb3J0ZWREYXRhKSk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbmRlciB0aGUgY29tcG9uZW50IHRvIHRoZSBnaXZlbiBpbnB1dCBET00gZWxlbWVudFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3JlbmRlcjogZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgICAgICBtcy5zZXROYW1lKGNmZy5uYW1lKTsgIC8vIG1ha2Ugc3VyZSB0aGUgZm9ybSBuYW1lIGlzIGNvcnJlY3RcbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgbWFpbiBkaXYsIHdpbGwgcmVsYXkgdGhlIGZvY3VzIGV2ZW50cyB0byB0aGUgY29udGFpbmVkIGlucHV0IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY3RuIGZvcm0tY29udHJvbCAnICsgKGNmZy5yZXN1bHRBc1N0cmluZyA/ICdtcy1hcy1zdHJpbmcgJyA6ICcnKSArIGNmZy5jbHMgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1sZycpID8gJyBpbnB1dC1sZycgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKCQoZWwpLmhhc0NsYXNzKCdpbnB1dC1zbScpID8gJyBpbnB1dC1zbScgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5kaXNhYmxlZCA9PT0gdHJ1ZSA/ICcgbXMtY3RuLWRpc2FibGVkJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWN0bi1yZWFkb25seScpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlID8gJycgOiAnIG1zLW5vLXRyaWdnZXInKSxcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IGNmZy5zdHlsZSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGNmZy5pZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmJsdXIoJC5wcm94eShoYW5kbGVycy5fb25CbHVyLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleWRvd24oJC5wcm94eShoYW5kbGVycy5fb25LZXlEb3duLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsIHRoaXMpKTtcblxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgIG1zLmlucHV0ID0gJCgnPGlucHV0Lz4nLCAkLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogY2ZnLmVkaXRhYmxlID09PSB0cnVlID8gJycgOiAnIG1zLWlucHV0LXJlYWRvbmx5JyxcbiAgICAgICAgICAgICAgICAgICAgcmVhZG9ubHk6ICFjZmcuZWRpdGFibGUsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjZmcucGxhY2Vob2xkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjZmcuZGlzYWJsZWRcbiAgICAgICAgICAgICAgICB9LCBjZmcuaW5wdXRDZmcpKTtcblxuICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRGb2N1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgIG1zLmlucHV0LmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRDbGljaywgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHN1Z2dlc3Rpb25zLiB3aWxsIGFsd2F5cyBiZSBwbGFjZWQgb24gZm9jdXNcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1jdG4gZHJvcGRvd24tbWVudSdcbiAgICAgICAgICAgICAgICB9KS5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgLy8gYmluZCB0aGUgb25jbGljayBhbmQgbW91c2VvdmVyIHVzaW5nIGRlbGVnYXRlZCBldmVudHMgKG5lZWRzIGpRdWVyeSA+PSAxLjcpXG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3gub24oJ2NsaWNrJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtU2VsZWN0ZWQsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5vbignbW91c2VvdmVyJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtTW91c2VPdmVyLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcjtcbiAgICAgICAgICAgICAgICAgICAgJChtcy5zZWxlY3Rpb25Db250YWluZXIpLmFkZENsYXNzKCdtcy1zZWwtY3RuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1jdG4nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuY2xpY2soJC5wcm94eShoYW5kbGVycy5fb25Gb2N1cywgdGhpcykpO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmICFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbXMuaGVscGVyID0gJCgnPHNwYW4vPicsIHtcbiAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLWhlbHBlciAnICsgY2ZnLmluZm9Nc2dDbHNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoKTtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLmhlbHBlcik7XG5cblxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgd2hvbGUgdGhpbmdcbiAgICAgICAgICAgICAgICAkKGVsKS5yZXBsYWNlV2l0aChtcy5jb250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgaWYoIWNmZy5zZWxlY3Rpb25Db250YWluZXIpe1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2goY2ZnLnNlbGVjdGlvblBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib3R0b20nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5pbnNlcnRBZnRlcihtcy5jb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25TdGFja2VkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci53aWR0aChtcy5jb250YWluZXIud2lkdGgoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5hZGRDbGFzcygnbXMtc3RhY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuY3NzKCdmbG9hdCcsICdsZWZ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hcHBlbmQobXMuc2VsZWN0aW9uQ29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgLy8gaG9sZHMgdGhlIHRyaWdnZXIgb24gdGhlIHJpZ2h0IHNpZGVcbiAgICAgICAgICAgICAgICBpZihjZmcuaGlkZVRyaWdnZXIgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLnRyaWdnZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtdHJpZ2dlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiAnPGRpdiBjbGFzcz1cIm1zLXRyaWdnZXItaWNvXCI+PC9kaXY+J1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgbXMudHJpZ2dlci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vblRyaWdnZXJDbGljaywgdGhpcykpO1xuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLnRyaWdnZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQod2luZG93KS5yZXNpemUoJC5wcm94eShoYW5kbGVycy5fb25XaW5kb3dSZXNpemVkLCB0aGlzKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBkbyBub3QgcGVyZm9ybSBhbiBpbml0aWFsIGNhbGwgaWYgd2UgYXJlIHVzaW5nIGFqYXggdW5sZXNzIHdlIGhhdmUgaW5pdGlhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwgfHwgY2ZnLmRhdGEgIT09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoY2ZnLmRhdGEpID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9hc3luY1ZhbHVlcyA9IGNmZy52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcudmFsdWUgIT09IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKGNmZy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICQoXCJib2R5XCIpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobXMuY29udGFpbmVyLmhhc0NsYXNzKCdtcy1jdG4tZm9jdXMnKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmhhcyhlLnRhcmdldCkubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbXMtcmVzLWl0ZW0nKSA8IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKCdtcy1jbG9zZS1idG4nKSA8IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lclswXSAhPT0gZS50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlbmRlcnMgZWFjaCBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfcmVuZGVyQ29tYm9JdGVtczogZnVuY3Rpb24oaXRlbXMsIGlzR3JvdXBlZCkge1xuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCBodG1sID0gJyc7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpc3BsYXllZCA9IGNmZy5yZW5kZXJlciAhPT0gbnVsbCA/IGNmZy5yZW5kZXJlci5jYWxsKHJlZiwgdmFsdWUpIDogdmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXNhYmxlZCA9IGNmZy5kaXNhYmxlZEZpZWxkICE9PSBudWxsICYmIHZhbHVlW2NmZy5kaXNhYmxlZEZpZWxkXSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtaXRlbSAnICsgKGlzR3JvdXBlZCA/ICdtcy1yZXMtaXRlbS1ncm91cGVkICc6JycpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGlzYWJsZWQgPyAnbXMtcmVzLWl0ZW0tZGlzYWJsZWQgJzonJykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChpbmRleCAlIDIgPT09IDEgJiYgY2ZnLnVzZVplYnJhU3R5bGUgPT09IHRydWUgPyAnbXMtcmVzLW9kZCcgOiAnJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBjZmcuaGlnaGxpZ2h0ID09PSB0cnVlID8gc2VsZi5faGlnaGxpZ2h0U3VnZ2VzdGlvbihkaXNwbGF5ZWQpIDogZGlzcGxheWVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2RhdGEtanNvbic6IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAkKCc8ZGl2Lz4nKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuY29tYm9ib3guYXBwZW5kKGh0bWwpO1xuICAgICAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW06Zmlyc3QnKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZW5kZXJzIHRoZSBzZWxlY3RlZCBpdGVtcyBpbnRvIHRoZWlyIGNvbnRhaW5lci5cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9yZW5kZXJTZWxlY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciByZWYgPSB0aGlzLCB3ID0gMCwgaW5wdXRPZmZzZXQgPSAwLCBpdGVtcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBhc1RleHQgPSBjZmcucmVzdWx0QXNTdHJpbmcgPT09IHRydWUgJiYgIV9oYXNGb2N1cztcblxuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5maW5kKCcubXMtc2VsLWl0ZW0nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJC5lYWNoKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSl7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkSXRlbUVsLCBkZWxJdGVtRWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1IdG1sID0gY2ZnLnNlbGVjdGlvblJlbmRlcmVyICE9PSBudWxsID8gY2ZnLnNlbGVjdGlvblJlbmRlcmVyLmNhbGwocmVmLCB2YWx1ZSkgOiB2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsaWRDbHMgPSBzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0odmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF0pID8gJycgOiAnIG1zLXNlbC1pbnZhbGlkJztcblxuICAgICAgICAgICAgICAgICAgICAvLyB0YWcgcmVwcmVzZW50aW5nIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGlmKGFzVGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1pdGVtIG1zLXNlbC10ZXh0ICcgKyBjZmcuc2VsZWN0aW9uQ2xzICsgdmFsaWRDbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogc2VsZWN0ZWRJdGVtSHRtbCArIChpbmRleCA9PT0gKF9zZWxlY3Rpb24ubGVuZ3RoIC0gMSkgPyAnJyA6IGNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWl0ZW0gJyArIGNmZy5zZWxlY3Rpb25DbHMgKyB2YWxpZENscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBzZWxlY3RlZEl0ZW1IdG1sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5kYXRhKCdqc29uJywgdmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZGlzYWJsZWQgPT09IGZhbHNlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzbWFsbCBjcm9zcyBpbWdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxJdGVtRWwgPSAkKCc8c3Bhbi8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY2xvc2UtYnRuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSkuYXBwZW5kVG8oc2VsZWN0ZWRJdGVtRWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsSXRlbUVsLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVGFnVHJpZ2dlckNsaWNrLCByZWYpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goc2VsZWN0ZWRJdGVtRWwpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5wcmVwZW5kKGl0ZW1zKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIHRoZSB2YWx1ZXMsIGJlaGF2aW91ciBvZiBtdWx0aXBsZSBzZWxlY3RcbiAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiAnZGlzcGxheTogbm9uZTsnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJC5lYWNoKG1zLmdldFZhbHVlKCksIGZ1bmN0aW9uKGksIHZhbCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbCA9ICQoJzxpbnB1dC8+Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjZmcubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZFRvKG1zLl92YWx1ZUNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbXMuX3ZhbHVlQ29udGFpbmVyLmFwcGVuZFRvKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZihjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgIWNmZy5zZWxlY3Rpb25Db250YWluZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQud2lkdGgoMCk7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0T2Zmc2V0ID0gbXMuaW5wdXQub2Zmc2V0KCkubGVmdCAtIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0O1xuICAgICAgICAgICAgICAgICAgICB3ID0gbXMuY29udGFpbmVyLndpZHRoKCkgLSBpbnB1dE9mZnNldCAtIDQyO1xuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC53aWR0aCh3KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmhlbHBlci5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZWxlY3QgYW4gaXRlbSBlaXRoZXIgdGhyb3VnaCBrZXlib2FyZCBvciBtb3VzZVxuICAgICAgICAgICAgICogQHBhcmFtIGl0ZW1cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9zZWxlY3RJdGVtOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYoY2ZnLm1heFNlbGVjdGlvbiA9PT0gMSl7XG4gICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKCdqc29uJykpO1xuICAgICAgICAgICAgICAgIGl0ZW0ucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzID09PSBmYWxzZSB8fCBfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbil7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKCFfaGFzRm9jdXMpe1xuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihfaGFzRm9jdXMgJiYgKGNmZy5leHBhbmRPbkZvY3VzIHx8IF9jdHJsRG93bikpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoX2N0cmxEb3duKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTb3J0cyB0aGUgcmVzdWx0cyBhbmQgY3V0IHRoZW0gZG93biB0byBtYXggIyBvZiBkaXNwbGF5ZWQgcmVzdWx0cyBhdCBvbmNlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfc29ydEFuZFRyaW06IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcSA9IG1zLmdldFJhd1ZhbHVlKCksXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gW10sXG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gW10sXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkVmFsdWVzID0gbXMuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgdGhlIGRhdGEgYWNjb3JkaW5nIHRvIGdpdmVuIGlucHV0XG4gICAgICAgICAgICAgICAgaWYocS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG9ialtjZmcuZGlzcGxheUZpZWxkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKChjZmcubWF0Y2hDYXNlID09PSB0cnVlICYmIG5hbWUuaW5kZXhPZihxKSA+IC0xKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjZmcubWF0Y2hDYXNlID09PSBmYWxzZSAmJiBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihxLnRvTG93ZXJDYXNlKCkpID4gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnN0cmljdFN1Z2dlc3QgPT09IGZhbHNlIHx8IG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWQucHVzaChvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZCA9IGRhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRha2Ugb3V0IHRoZSBvbmVzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAkLmVhY2goZmlsdGVyZWQsIGZ1bmN0aW9uKGluZGV4LCBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5hbGxvd0R1cGxpY2F0ZXMgfHwgJC5pbkFycmF5KG9ialtjZmcudmFsdWVGaWVsZF0sIHNlbGVjdGVkVmFsdWVzKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNvcnQgdGhlIGRhdGFcbiAgICAgICAgICAgICAgICBpZihjZmcuc29ydE9yZGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnNvcnQoZnVuY3Rpb24oYSxiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdIDwgYltjZmcuc29ydE9yZGVyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAtMSA6IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdID4gYltjZmcuc29ydE9yZGVyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcuc29ydERpciA9PT0gJ2FzYycgPyAxIDogLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHRyaW0gaXQgZG93blxuICAgICAgICAgICAgICAgIGlmKGNmZy5tYXhTdWdnZXN0aW9ucyAmJiBjZmcubWF4U3VnZ2VzdGlvbnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zID0gbmV3U3VnZ2VzdGlvbnMuc2xpY2UoMCwgY2ZnLm1heFN1Z2dlc3Rpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ld1N1Z2dlc3Rpb25zO1xuXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfZ3JvdXA6IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgIC8vIGJ1aWxkIGdyb3Vwc1xuICAgICAgICAgICAgICAgIGlmKGNmZy5ncm91cEJ5ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIF9ncm91cHMgPSB7fTtcblxuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcHMgPSBjZmcuZ3JvdXBCeS5pbmRleE9mKCcuJykgPiAtMSA/IGNmZy5ncm91cEJ5LnNwbGl0KCcuJykgOiBjZmcuZ3JvdXBCeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wID0gdmFsdWVbY2ZnLmdyb3VwQnldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKHByb3BzKSAhPSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKHByb3BzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcFtwcm9wcy5zaGlmdCgpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfZ3JvdXBzW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdID0ge3RpdGxlOiBwcm9wLCBpdGVtczogW3ZhbHVlXX07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzW3Byb3BdLml0ZW1zLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFVwZGF0ZSB0aGUgaGVscGVyIHRleHRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF91cGRhdGVIZWxwZXI6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaHRtbChodG1sKTtcbiAgICAgICAgICAgICAgICBpZighbXMuaGVscGVyLmlzKFwiOnZpc2libGVcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmZhZGVJbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmFsaWRhdGUgYW4gaXRlbSBhZ2FpbnN0IHZ0eXBlIG9yIHZyZWdleFxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3ZhbGlkYXRlU2luZ2xlSXRlbTogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIGlmKGNmZy52cmVnZXggIT09IG51bGwgJiYgY2ZnLnZyZWdleCBpbnN0YW5jZW9mIFJlZ0V4cCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmcudnJlZ2V4LnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjZmcudnR5cGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGNmZy52dHlwZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdhbHBoYSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eW2EtekEtWl9dKyQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2FscGhhbnVtJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15bYS16QS1aMC05X10rJC8pLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZW1haWwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICgvXihcXHcrKShbXFwtKy5dW1xcd10rKSpAKFxcd1tcXC1cXHddKlxcLil7MSw1fShbQS1aYS16XSl7Miw2fSQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VybCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC8oKCheaHR0cHM/KXwoXmZ0cCkpOlxcL1xcLyhbXFwtXFx3XStcXC4pK1xcd3syLDN9KFxcL1slXFwtXFx3XSsoXFwuXFx3ezIsfSk/KSooKFtcXHdcXC1cXC5cXD9cXFxcXFwvK0AmIztgfj0lIV0qKShcXC5cXHd7Mix9KT8pKlxcLz8pL2kpLnRlc3QodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaXBhZGRyZXNzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoL15cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSQvKS50ZXN0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaGFuZGxlcnMgPSB7XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGJsdXJyaW5nIG91dCBvZiB0aGUgY29tcG9uZW50XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25CbHVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ21zLWN0bi1mb2N1cycpO1xuICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XG4gICAgICAgICAgICAgICAgX2hhc0ZvY3VzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYobXMuZ2V0UmF3VmFsdWUoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0ge307XG4gICAgICAgICAgICAgICAgICAgIG9ialtjZmcuZGlzcGxheUZpZWxkXSA9IG9ialtjZmcudmFsdWVGaWVsZF0gPSBtcy5nZXRSYXdWYWx1ZSgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG5cbiAgICAgICAgICAgICAgICBpZihtcy5pc1ZhbGlkKCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZWxzZSBpZihtcy5pbnB1dC52YWwoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcignJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignYmx1cicsIFttc10pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBob3ZlcmluZyBhbiBlbGVtZW50IGluIHRoZSBjb21ib1xuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbU1vdXNlT3ZlcjogZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICAgICAgaWYoIXRhcmdldC5oYXNDbGFzcygnbXMtcmVzLWl0ZW0tZGlzYWJsZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYW4gaXRlbSBpcyBjaG9zZW4gZnJvbSB0aGUgbGlzdFxuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbVNlbGVjdGVkOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgICAgICBpZighdGFyZ2V0Lmhhc0NsYXNzKCdtcy1yZXMtaXRlbS1kaXNhYmxlZCcpKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fc2VsZWN0SXRlbSgkKGUuY3VycmVudFRhcmdldCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gZm9jdXNpbmcgb24gdGhlIGNvbnRhaW5lciBkaXYuIFdpbGwgZm9jdXMgb24gdGhlIGlucHV0IGZpZWxkIGluc3RlYWQuXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25Gb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgb24gdGhlIGlucHV0IHRleHQgZmllbGRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbklucHV0Q2xpY2s6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgX2hhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcudG9nZ2xlT25DbGljayA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy5leHBhbmRlZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGZvY3VzaW5nIG9uIHRoZSBpbnB1dCB0ZXh0IGZpZWxkLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX29uSW5wdXRGb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhX2hhc0ZvY3VzKSB7XG4gICAgICAgICAgICAgICAgICAgIF9oYXNGb2N1cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWZvY3VzJyk7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyA9PT0gdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKGN1ckxlbmd0aCA8IGNmZy5taW5DaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignZm9jdXMnLCBbbXNdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSB1c2VyIHByZXNzZXMgYSBrZXkgd2hpbGUgdGhlIGNvbXBvbmVudCBoYXMgZm9jdXNcbiAgICAgICAgICAgICAqIFRoaXMgaXMgd2hlcmUgd2Ugd2FudCB0byBoYW5kbGUgYWxsIGtleXMgdGhhdCBkb24ndCByZXF1aXJlIHRoZSB1c2VyIGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgKiBzaW5jZSBpdCBoYXNuJ3QgcmVnaXN0ZXJlZCB0aGUga2V5IGhpdCB5ZXRcbiAgICAgICAgICAgICAqIEBwYXJhbSBlIGtleUV2ZW50XG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25LZXlEb3duOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaG93IHRhYiBzaG91bGQgYmUgaGFuZGxlZFxuICAgICAgICAgICAgICAgIHZhciBhY3RpdmUgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0JyksXG4gICAgICAgICAgICAgICAgICAgIGZyZWVJbnB1dCA9IG1zLmlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleWRvd24nLCBbbXMsIGVdKTtcblxuICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuVEFCICYmIChjZmcudXNlVGFiS2V5ID09PSBmYWxzZSB8fFxuICAgICAgICAgICAgICAgICAgICAoY2ZnLnVzZVRhYktleSA9PT0gdHJ1ZSAmJiBhY3RpdmUubGVuZ3RoID09PSAwICYmIG1zLmlucHV0LnZhbCgpLmxlbmd0aCA9PT0gMCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLl9vbkJsdXIoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQkFDS1NQQUNFOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRTZWxlY3Rpb24oKS5sZW5ndGggPiAwICYmIGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24ucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW21zLCBtcy5nZXRTZWxlY3Rpb24oKV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiBtcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVTQzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVOVEVSOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0ICE9PSAnJyB8fCBjZmcuZXhwYW5kZWQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnVzZUNvbW1hS2V5ID09PSB0cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5DVFJMOlxuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkRPV05BUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX21vdmVTZWxlY3RlZFJvdyhcImRvd25cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5VUEFSUk9XOlxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbW92ZVNlbGVjdGVkUm93KFwidXBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBhIGtleSBpcyByZWxlYXNlZCB3aGlsZSB0aGUgY29tcG9uZW50IGhhcyBmb2N1c1xuICAgICAgICAgICAgICogQHBhcmFtIGVcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vbktleVVwOiBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZyZWVJbnB1dCA9IG1zLmdldFJhd1ZhbHVlKCksXG4gICAgICAgICAgICAgICAgICAgIGlucHV0VmFsaWQgPSAkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICghY2ZnLm1heEVudHJ5TGVuZ3RoIHx8ICQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoIDw9IGNmZy5tYXhFbnRyeUxlbmd0aCksXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLFxuICAgICAgICAgICAgICAgICAgICBvYmogPSB7fTtcblxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleXVwJywgW21zLCBlXSk7XG5cbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RpbWVyKTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbGxhcHNlIGlmIGVzY2FwZSwgYnV0IGtlZXAgZm9jdXMuXG4gICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09PSBLRVlDT0RFUy5FU0MgJiYgY2ZnLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gaWdub3JlIGEgYnVuY2ggb2Yga2V5c1xuICAgICAgICAgICAgICAgIGlmKChlLmtleUNvZGUgPT09IEtFWUNPREVTLlRBQiAmJiBjZmcudXNlVGFiS2V5ID09PSBmYWxzZSkgfHwgKGUua2V5Q29kZSA+IEtFWUNPREVTLkVOVEVSICYmIGUua2V5Q29kZSA8IEtFWUNPREVTLlNQQUNFKSkge1xuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLkNUUkwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVVBBUlJPVzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRU5URVI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxuICAgICAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgIT09IEtFWUNPREVTLkNPTU1BIHx8IGNmZy51c2VDb21tYUtleSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKXsgLy8gaWYgYSBzZWxlY3Rpb24gaXMgcGVyZm9ybWVkLCBzZWxlY3QgaXQgYW5kIHJlc2V0IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW0tYWN0aXZlOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VsZWN0ZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RJdGVtKHNlbGVjdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIG5vIHNlbGVjdGlvbiBvciBpZiBmcmVldGV4dCBlbnRlcmVkIGFuZCBmcmVlIGVudHJpZXMgYWxsb3dlZCwgYWRkIG5ldyBvYmogdG8gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpbnB1dFZhbGlkID09PSB0cnVlICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW2NmZy5kaXNwbGF5RmllbGRdID0gb2JqW2NmZy52YWx1ZUZpZWxkXSA9IGZyZWVJbnB1dC50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpOyAvLyByZXNldCBjb21ibyBzdWdnZXN0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA8IGNmZy5taW5DaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLCBjZmcubWluQ2hhcnMgLSBmcmVlSW5wdXQubGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmKGNmZy5tYXhFbnRyeUxlbmd0aCAmJiBmcmVlSW5wdXQubGVuZ3RoID4gY2ZnLm1heEVudHJ5TGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4RW50cnlSZW5kZXJlci5jYWxsKHRoaXMsIGZyZWVJbnB1dC5sZW5ndGggLSBjZmcubWF4RW50cnlMZW5ndGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcubWluQ2hhcnMgPD0gZnJlZUlucHV0Lmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBjZmcudHlwZURlbGF5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gY2xpY2tpbmcgdXBvbiBjcm9zcyBmb3IgZGVsZXRpb25cbiAgICAgICAgICAgICAqIEBwYXJhbSBlXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25UYWdUcmlnZ2VyQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBtcy5yZW1vdmVGcm9tU2VsZWN0aW9uKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCdqc29uJykpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyBvbiB0aGUgc21hbGwgdHJpZ2dlciBpbiB0aGUgcmlnaHRcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9vblRyaWdnZXJDbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYobXMuaXNEaXNhYmxlZCgpID09PSBmYWxzZSAmJiAhKGNmZy5leHBhbmRPbkZvY3VzID09PSB0cnVlICYmIF9zZWxlY3Rpb24ubGVuZ3RoID09PSBjZmcubWF4U2VsZWN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCd0cmlnZ2VyY2xpY2snLCBbbXNdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY3VyTGVuZ3RoID49IGNmZy5taW5DaGFycyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5leHBhbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIHRoZSBicm93c2VyIHdpbmRvdyBpcyByZXNpemVkXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfb25XaW5kb3dSZXNpemVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzdGFydHVwIHBvaW50XG4gICAgICAgIGlmKGVsZW1lbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNlbGYuX3JlbmRlcihlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmZuLm1hZ2ljU3VnZ2VzdCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIG9iaiA9ICQodGhpcyk7XG5cbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSAmJiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0JykpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBvYmouZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgICAgICAvLyBhc3N1bWUgJCh0aGlzKSBpcyBhbiBlbGVtZW50XG4gICAgICAgICAgICB2YXIgY250ciA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFJldHVybiBlYXJseSBpZiB0aGlzIGVsZW1lbnQgYWxyZWFkeSBoYXMgYSBwbHVnaW4gaW5zdGFuY2VcbiAgICAgICAgICAgIGlmKGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0Jykpe1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGhpcy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0Jyl7IC8vIHJlbmRlcmluZyBmcm9tIHNlbGVjdFxuICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMudmFsdWUgPSBbXTtcbiAgICAgICAgICAgICAgICAkLmVhY2godGhpcy5jaGlsZHJlbiwgZnVuY3Rpb24oaW5kZXgsIGNoaWxkKXtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2hpbGQubm9kZU5hbWUgJiYgY2hpbGQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ29wdGlvbicpe1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhLnB1c2goe2lkOiBjaGlsZC52YWx1ZSwgbmFtZTogY2hpbGQudGV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoJChjaGlsZCkuYXR0cignc2VsZWN0ZWQnKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy52YWx1ZS5wdXNoKGNoaWxkLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZGVmID0ge307XG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVzIGZyb20gRE9NIGNvbnRhaW5lciBlbGVtZW50XG4gICAgICAgICAgICAkLmVhY2godGhpcy5hdHRyaWJ1dGVzLCBmdW5jdGlvbihpLCBhdHQpe1xuICAgICAgICAgICAgICAgIGRlZlthdHQubmFtZV0gPSBhdHQubmFtZSA9PT0gJ3ZhbHVlJyAmJiBhdHQudmFsdWUgIT09ICcnID8gSlNPTi5wYXJzZShhdHQudmFsdWUpIDogYXR0LnZhbHVlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBmaWVsZCA9IG5ldyBNYWdpY1N1Z2dlc3QodGhpcywgJC5leHRlbmQoW10sICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzLCBvcHRpb25zLCBkZWYpKTtcbiAgICAgICAgICAgIGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0JywgZmllbGQpO1xuICAgICAgICAgICAgZmllbGQuY29udGFpbmVyLmRhdGEoJ21hZ2ljU3VnZ2VzdCcsIGZpZWxkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH07XG5cbiAgICQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzID0ge307XG59KShqUXVlcnkpO1xuIl19
