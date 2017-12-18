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

$(document).ready(function() {
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

    // layout Masonry after each image loads
    $('.grid').imagesLoaded().progress( function() {
      $('.grid').masonry('layout');
    });

 })

'use strict';

function escapeHTML(string) {
    return string.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getCleanName(feature, property){
    //return string stipped of html codes
    return escapeHTML(feature.getProperty(property));
}

function getKeywordUrls(mainUrl, keywordArray){
    // Returns a string of html links based on array of keywords
    var result = '';
    var aLen = Math.min(3,  keywordArray.length);
    for (var i = 0; i < aLen; i++) {
      html = [
        '<a class="thumbnailHashtag" href="' + mainUrl + keywordArray[i] + '">',
            '#' + keywordArray[i],
         '</a>'
      ].join("\n");
      result += html;
    }
    return result;
}


function generateBox(feature){
 // Generates the HTML code for the map info window
 var search_page_url = '/post/q/';

 var name = getCleanName(feature, 'name');
 var description = getCleanName(feature, 'description');
 var image_url = getCleanName(feature, 'image_url');
 var location_keyword = getCleanName(feature, 'location');
 var keywords = getCleanName(feature, 'keywords').split(',');
 var recommender = getCleanName(feature, 'recommender');
 var docid = getCleanName(feature, 'docid');
 var website = getCleanName(feature, 'website');
 var address = getCleanName(feature, 'address');


 var location_url = search_page_url + location_keyword;
 var keyword_urls = getKeywordUrls(search_page_url, keywords);
 var recommender_url = search_page_url + 'recommender=' + recommender.replace(',', '');
 var google_maps_directions = 'https://www.google.com/maps?saddr=My+Location&daddr=' + address.replace(' ', '+');

 var html = [
 '<div class="box" style="max-width:300px;">',
    '<img class="img-fluid" data-gifffer="' + image_url + '">',
    '<ul class="additionalLinks" style="margin-left:0px;padding-left:0px;padding-top:3px">',
        '<div>',
            '<i class="fa fa-map-marker map-marker" aria-hidden="true"></i>',
            '<a class="thumbnailLocation" href="' + location_url + '">',
                location_keyword,
             '</a>',
        '</div>',
        '<li class="iconList">',
            '<h1 class="thumbnailTitle">' + name + '</h1>',
         '</li>',
    '</ul>',
    '<div class="addPadding">' + keyword_urls + '</div>',
    '<div class="tab">',
        '<br><a class="linkRecommendedBy" href="' + recommender_url + '"> BY ' + recommender + '</a>',
        '<input id="' + docid + '" class="hidden draaiknopje" type="checkbox" name="tabs">',
        '<label for="' + docid + '">',
            '<ul class="additionalLinks" style="margin-left:0px;padding-left:0px;padding-top:10px">',
                '<li class="iconList"><a href="' + website + '">',
                    '<img src="/p/img/ic_open_in_new_black_24px.png" class="postIcon">',
                '</a></li>',
                '<li class="iconList"><a href="' + google_maps_directions + '">',
                    '<img src="/p/img/ic_directions_black_24px.png" class="postIcon">',
                 '</a></li>',
            '</ul>',
        '</label>',
        '<div class="tab-content">',
            '<p class="pLeft">' + description + '</p>',
        '</div>',
    '</div>',
 '</div>'
  ];
 return html.join("\n");

}


function processPoints(geometry, callback, thisArg) {
  if (geometry instanceof google.maps.LatLng) {
    callback.call(thisArg, geometry);
  } else if (geometry instanceof google.maps.Data.Point) {
    callback.call(thisArg, geometry.get());
  } else {
    geometry.getArray().forEach(function (g) {
      processPoints(g, callback, thisArg);
    });
  }
}

function initMap() {
  // Create the map.
  var map = new google.maps.Map(document.getElementsByClassName('map')[0], {
    zoom: 7,
    center: { lat: 0, lng: 0 },
  });

  var bounds = new google.maps.LatLngBounds();
  map.data.addListener('addfeature', function (e) {
    processPoints(e.feature.getGeometry(), bounds.extend, bounds);

    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
       var extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.01, bounds.getNorthEast().lng() + 0.01);
       var extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.01, bounds.getNorthEast().lng() - 0.01);
       bounds.extend(extendPoint1);
       bounds.extend(extendPoint2);
    }

    map.fitBounds(bounds);
  });
  console.log(query);

  api_url = '/api/v1/post/' + query;
  // Load the stores GeoJSON onto the map.
  map.data.loadGeoJson(api_url);

  var apiKey = 'AIzaSyAbcMGMULgp5l0Trav2G3OseIrNGIxHDZk';
  var infoWindow = new google.maps.InfoWindow();
  infoWindow.setOptions({ pixelOffset: new google.maps.Size(0, -30) });

  // Show the information for a store when its marker is clicked.
  map.data.addListener('click', function (event) {
  var position = event.feature.getGeometry().get();
  var content = generateBox(event.feature);

  infoWindow.setContent(content);
  infoWindow.setPosition(position);

  infoWindow.open(map);

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

  });
}

$('.map_link').on('click',function() {
  $("#restaurant").css({"display":"none"});

  $("#map").fadeIn();
  initMap();
  $("a.lista").css({"color":"gray"});
  $("a.mapa").css({"color":"black"});


})

$('.list_link').on('click',function() {
  $("#map").css({"display":"none"});
  $("#restaurant").fadeIn();

  $("a.lista").css({"color":"black"});
  $("a.mapa").css({"color":"gray"});

})
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiLCJmb2xsb3dfY29kZS5qcyIsImdpZmZmZXIuanMiLCJsb2FkLmpzIiwibWFwcy5qcyIsIm1hc29ucnkucGtnZC5taW4uanMiLCJzdGFyX2NvZGUuanMiLCJzaXRlL25pY29sYXNiaXplLW1hZ2ljc3VnZ2VzdC0yMzBiMDhiL21hZ2ljc3VnZ2VzdC1taW4uanMiLCJzaXRlL25pY29sYXNiaXplLW1hZ2ljc3VnZ2VzdC0yMzBiMDhiL21hZ2ljc3VnZ2VzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUFBLE1BQU0sQ0FBQyxRQUFQLEdBQWtCLFNBQUMsTUFBRCxFQUFTLEdBQVQsRUFBYyxNQUFkLEVBQXNCLElBQXRCLEVBQTRCLFFBQTVCO0FBQ2hCLFFBQUE7SUFBQSxRQUFBLEdBQVcsUUFBQSxJQUFZLElBQVosSUFBb0I7SUFDL0IsSUFBQSxHQUFPLElBQUEsSUFBUTtJQUNmLElBQUcsU0FBUyxDQUFDLE1BQVYsS0FBb0IsQ0FBdkI7TUFDRSxJQUFBLEdBQU8sT0FEVDs7SUFFQSxJQUFHLFNBQVMsQ0FBQyxNQUFWLEtBQXFCLENBQXhCO01BQ0UsTUFBQSxHQUFTO01BQ1QsSUFBQSxHQUFPLE9BRlQ7O0lBR0EsTUFBQSxHQUFTLE1BQUEsSUFBVTtBQUNuQixTQUFBLFdBQUE7O01BQ0UsSUFBd0IsU0FBeEI7UUFBQSxPQUFPLE1BQU8sQ0FBQSxDQUFBLEVBQWQ7O0FBREY7SUFFQSxTQUFBLEdBQWUsR0FBRyxDQUFDLE1BQUosQ0FBVyxLQUFYLENBQUEsSUFBcUIsQ0FBeEIsR0FBK0IsR0FBL0IsR0FBd0M7V0FDcEQsQ0FBQyxDQUFDLElBQUYs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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ3aW5kb3cuYXBpX2NhbGwgPSAobWV0aG9kLCB1cmwsIHBhcmFtcywgZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBkYXRhIHx8IHBhcmFtc1xyXG4gIGRhdGEgPSBkYXRhIHx8IHBhcmFtc1xyXG4gIGlmIGFyZ3VtZW50cy5sZW5ndGggPT0gNFxyXG4gICAgZGF0YSA9IHVuZGVmaW5lZFxyXG4gIGlmIGFyZ3VtZW50cy5sZW5ndGggPT0gIDNcclxuICAgIHBhcmFtcyA9IHVuZGVmaW5lZFxyXG4gICAgZGF0YSA9IHVuZGVmaW5lZFxyXG4gIHBhcmFtcyA9IHBhcmFtcyB8fCB7fVxyXG4gIGZvciBrLCB2IG9mIHBhcmFtc1xyXG4gICAgZGVsZXRlIHBhcmFtc1trXSBpZiBub3Qgdj9cclxuICBzZXBhcmF0b3IgPSBpZiB1cmwuc2VhcmNoKCdcXFxcPycpID49IDAgdGhlbiAnJicgZWxzZSAnPydcclxuICAkLmFqYXhcclxuICAgIHR5cGU6IG1ldGhvZFxyXG4gICAgdXJsOiBcIiN7dXJsfSN7c2VwYXJhdG9yfSN7JC5wYXJhbSBwYXJhbXN9XCJcclxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgIGFjY2VwdHM6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgZGF0YTogaWYgZGF0YSB0aGVuIEpTT04uc3RyaW5naWZ5KGRhdGEpIGVsc2UgdW5kZWZpbmVkXHJcbiAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgaWYgZGF0YS5zdGF0dXMgPT0gJ3N1Y2Nlc3MnXHJcbiAgICAgICAgbW9yZSA9IHVuZGVmaW5lZFxyXG4gICAgICAgIGlmIGRhdGEubmV4dF91cmxcclxuICAgICAgICAgIG1vcmUgPSAoY2FsbGJhY2spIC0+IGFwaV9jYWxsKG1ldGhvZCwgZGF0YS5uZXh0X3VybCwge30sIGNhbGxiYWNrKVxyXG4gICAgICAgIGNhbGxiYWNrPyB1bmRlZmluZWQsIGRhdGEucmVzdWx0LCBtb3JlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjaz8gZGF0YVxyXG4gICAgZXJyb3I6IChqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24pIC0+XHJcbiAgICAgIGVycm9yID1cclxuICAgICAgICBlcnJvcl9jb2RlOiAnYWpheF9lcnJvcidcclxuICAgICAgICB0ZXh0X3N0YXR1czogdGV4dFN0YXR1c1xyXG4gICAgICAgIGVycm9yX3Rocm93bjogZXJyb3JUaHJvd25cclxuICAgICAgICBqcVhIUjoganFYSFJcclxuICAgICAgdHJ5XHJcbiAgICAgICAgZXJyb3IgPSAkLnBhcnNlSlNPTihqcVhIUi5yZXNwb25zZVRleHQpIGlmIGpxWEhSLnJlc3BvbnNlVGV4dFxyXG4gICAgICBjYXRjaCBlXHJcbiAgICAgICAgZXJyb3IgPSBlcnJvclxyXG4gICAgICBMT0cgJ2FwaV9jYWxsIGVycm9yJywgZXJyb3JcclxuICAgICAgY2FsbGJhY2s/IGVycm9yXHJcbiIsIigtPlxyXG4gIGNsYXNzIHdpbmRvdy5GaWxlVXBsb2FkZXJcclxuICAgIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMpIC0+XHJcbiAgICAgIEB1cGxvYWRfaGFuZGxlciA9IEBvcHRpb25zLnVwbG9hZF9oYW5kbGVyXHJcbiAgICAgIEBzZWxlY3RvciA9IEBvcHRpb25zLnNlbGVjdG9yXHJcbiAgICAgIEBkcm9wX2FyZWEgPSBAb3B0aW9ucy5kcm9wX2FyZWFcclxuICAgICAgQHVwbG9hZF91cmwgPSBAb3B0aW9ucy51cGxvYWRfdXJsIG9yIFwiL2FwaS92MSN7d2luZG93LmxvY2F0aW9uLnBhdGhuYW1lfVwiXHJcbiAgICAgIEBjb25maXJtX21lc3NhZ2UgPSBAb3B0aW9ucy5jb25maXJtX21lc3NhZ2Ugb3IgJ0ZpbGVzIGFyZSBzdGlsbCBiZWluZyB1cGxvYWRlZC4nXHJcbiAgICAgIEBhbGxvd2VkX3R5cGVzID0gQG9wdGlvbnMuYWxsb3dlZF90eXBlc1xyXG4gICAgICBAbWF4X3NpemUgPSBAb3B0aW9ucy5tYXhfc2l6ZVxyXG5cclxuICAgICAgQGFjdGl2ZV9maWxlcyA9IDBcclxuXHJcbiAgICAgIEBzZWxlY3Rvcj8uYmluZCAnY2hhbmdlJywgKGUpID0+XHJcbiAgICAgICAgQGZpbGVfc2VsZWN0X2hhbmRsZXIoZSlcclxuXHJcbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgICAgIGlmIEBkcm9wX2FyZWE/IGFuZCB4aHIudXBsb2FkXHJcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJhZ292ZXInLCBAZmlsZV9kcmFnX2hvdmVyXHJcbiAgICAgICAgQGRyb3BfYXJlYS5vbiAnZHJhZ2xlYXZlJywgQGZpbGVfZHJhZ19ob3ZlclxyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2Ryb3AnLCAoZSkgPT5cclxuICAgICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyIGVcclxuICAgICAgICBAZHJvcF9hcmVhLnNob3coKVxyXG5cclxuICAgICAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gPT5cclxuICAgICAgICBpZiBAY29uZmlybV9tZXNzYWdlPyBhbmQgQGFjdGl2ZV9maWxlcyA+IDBcclxuICAgICAgICAgIHJldHVybiBAY29uZmlybV9tZXNzYWdlXHJcblxyXG4gICAgZmlsZV9kcmFnX2hvdmVyOiAoZSkgPT5cclxuICAgICAgaWYgbm90IEBkcm9wX2FyZWE/XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgIGlmIGUudHlwZSBpcyAnZHJhZ292ZXInXHJcbiAgICAgICAgQGRyb3BfYXJlYS5hZGRDbGFzcyAnZHJhZy1ob3ZlcidcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBkcm9wX2FyZWEucmVtb3ZlQ2xhc3MgJ2RyYWctaG92ZXInXHJcblxyXG4gICAgZmlsZV9zZWxlY3RfaGFuZGxlcjogKGUpID0+XHJcbiAgICAgIEBmaWxlX2RyYWdfaG92ZXIoZSlcclxuICAgICAgZmlsZXMgPSBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyPy5maWxlcyBvciBlLnRhcmdldD8uZmlsZXMgb3IgZS5kYXRhVHJhbnNmZXI/LmZpbGVzXHJcbiAgICAgIGlmIGZpbGVzPy5sZW5ndGggPiAwXHJcbiAgICAgICAgQHVwbG9hZF9maWxlcyhmaWxlcylcclxuXHJcbiAgICB1cGxvYWRfZmlsZXM6IChmaWxlcykgPT5cclxuICAgICAgQGdldF91cGxvYWRfdXJscyBmaWxlcy5sZW5ndGgsIChlcnJvciwgdXJscykgPT5cclxuICAgICAgICBpZiBlcnJvclxyXG4gICAgICAgICAgY29uc29sZS5sb2cgJ0Vycm9yIGdldHRpbmcgVVJMcycsIGVycm9yXHJcbiAgICAgICAgICByZXR1cm5cclxuICAgICAgICBAcHJvY2Vzc19maWxlcyBmaWxlcywgdXJscywgMFxyXG5cclxuICAgIGdldF91cGxvYWRfdXJsczogKG4sIGNhbGxiYWNrKSA9PlxyXG4gICAgICByZXR1cm4gaWYgbiA8PSAwXHJcbiAgICAgIGFwaV9jYWxsICdHRVQnLCBAdXBsb2FkX3VybCwge2NvdW50OiBufSwgKGVycm9yLCByZXN1bHQpIC0+XHJcbiAgICAgICAgaWYgZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrIGVycm9yXHJcbiAgICAgICAgICB0aHJvdyBlcnJvclxyXG4gICAgICAgIGNhbGxiYWNrIHVuZGVmaW5lZCwgcmVzdWx0XHJcblxyXG4gICAgcHJvY2Vzc19maWxlczogKGZpbGVzLCB1cmxzLCBpKSA9PlxyXG4gICAgICByZXR1cm4gaWYgaSA+PSBmaWxlcy5sZW5ndGhcclxuICAgICAgQHVwbG9hZF9maWxlIGZpbGVzW2ldLCB1cmxzW2ldLnVwbG9hZF91cmwsIEB1cGxvYWRfaGFuZGxlcj8ucHJldmlldyhmaWxlc1tpXSksICgpID0+XHJcbiAgICAgICAgQHByb2Nlc3NfZmlsZXMgZmlsZXMsIHVybHMsIGkgKyAxLCBAdXBsb2FkX2hhbmRsZXI/XHJcblxyXG4gICAgdXBsb2FkX2ZpbGU6IChmaWxlLCB1cmwsIHByb2dyZXNzLCBjYWxsYmFjaykgPT5cclxuICAgICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcclxuICAgICAgaWYgQGFsbG93ZWRfdHlwZXM/Lmxlbmd0aCA+IDBcclxuICAgICAgICBpZiBmaWxlLnR5cGUgbm90IGluIEBhbGxvd2VkX3R5cGVzXHJcbiAgICAgICAgICBwcm9ncmVzcyAwLCB1bmRlZmluZWQsICd3cm9uZ190eXBlJ1xyXG4gICAgICAgICAgY2FsbGJhY2soKVxyXG4gICAgICAgICAgcmV0dXJuXHJcblxyXG4gICAgICBpZiBAbWF4X3NpemU/XHJcbiAgICAgICAgaWYgZmlsZS5zaXplID4gQG1heF9zaXplXHJcbiAgICAgICAgICBwcm9ncmVzcyAwLCB1bmRlZmluZWQsICd0b29fYmlnJ1xyXG4gICAgICAgICAgY2FsbGJhY2soKVxyXG4gICAgICAgICAgcmV0dXJuXHJcblxyXG4gICAgICAjICQoJyNpbWFnZScpLnZhbChmaWxlLm5hbWUpO1xyXG4gICAgICB4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIgJ3Byb2dyZXNzJywgKGV2ZW50KSAtPlxyXG4gICAgICAgIHByb2dyZXNzIHBhcnNlSW50IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsICogMTAwLjBcclxuXHJcbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoZXZlbnQpID0+XHJcbiAgICAgICAgaWYgeGhyLnJlYWR5U3RhdGUgPT0gNFxyXG4gICAgICAgICAgaWYgeGhyLnN0YXR1cyA9PSAyMDBcclxuICAgICAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpXHJcbiAgICAgICAgICAgIHByb2dyZXNzIDEwMC4wLCByZXNwb25zZS5yZXN1bHRcclxuICAgICAgICAgICAgIyAvLyQoJyNjb250ZW50JykudmFsKHhoci5yZXNwb25zZVRleHQpXHJcbiAgICAgICAgICAgICQoJyNpbWFnZScpLnZhbCgkKCcjaW1hZ2UnKS52YWwoKSAgKyByZXNwb25zZS5yZXN1bHQuaWQgKyAnOycpO1xyXG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnZXJyb3InXHJcbiAgICAgICAgICAgIEBhY3RpdmVfZmlsZXMgLT0gMVxyXG5cclxuICAgICAgeGhyLm9wZW4gJ1BPU1QnLCB1cmwsIHRydWVcclxuICAgICAgZGF0YSA9IG5ldyBGb3JtRGF0YSgpXHJcbiAgICAgIGRhdGEuYXBwZW5kICdmaWxlJywgZmlsZVxyXG4gICAgICB4aHIuc2VuZCBkYXRhXHJcbiAgICAgIGNhbGxiYWNrKClcclxuKSgpIiwid2luZG93LkxPRyA9IC0+XHJcbiAgY29uc29sZT8ubG9nPyBhcmd1bWVudHMuLi5cclxuXHJcblxyXG53aW5kb3cuaW5pdF9jb21tb24gPSAtPlxyXG4gIGluaXRfbG9hZGluZ19idXR0b24oKVxyXG4gIGluaXRfY29uZmlybV9idXR0b24oKVxyXG4gIGluaXRfcGFzc3dvcmRfc2hvd19idXR0b24oKVxyXG4gIGluaXRfdGltZSgpXHJcbiAgaW5pdF9hbm5vdW5jZW1lbnQoKVxyXG4gIGluaXRfcm93X2xpbmsoKVxyXG5cclxuXHJcbndpbmRvdy5pbml0X2xvYWRpbmdfYnV0dG9uID0gLT5cclxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tbG9hZGluZycsIC0+XHJcbiAgICAkKHRoaXMpLmJ1dHRvbiAnbG9hZGluZydcclxuXHJcblxyXG53aW5kb3cuaW5pdF9jb25maXJtX2J1dHRvbiA9IC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWNvbmZpcm0nLCAtPlxyXG4gICAgaWYgbm90IGNvbmZpcm0gJCh0aGlzKS5kYXRhKCdtZXNzYWdlJykgb3IgJ0FyZSB5b3Ugc3VyZT8nXHJcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9wYXNzd29yZF9zaG93X2J1dHRvbiA9IC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLXBhc3N3b3JkLXNob3cnLCAtPlxyXG4gICAgJHRhcmdldCA9ICQoJCh0aGlzKS5kYXRhICd0YXJnZXQnKVxyXG4gICAgJHRhcmdldC5mb2N1cygpXHJcbiAgICBpZiAkKHRoaXMpLmhhc0NsYXNzICdhY3RpdmUnXHJcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICdwYXNzd29yZCdcclxuICAgIGVsc2VcclxuICAgICAgJHRhcmdldC5hdHRyICd0eXBlJywgJ3RleHQnXHJcblxyXG5cclxud2luZG93LmluaXRfdGltZSA9IC0+XHJcbiAgaWYgJCgndGltZScpLmxlbmd0aCA+IDBcclxuICAgIHJlY2FsY3VsYXRlID0gLT5cclxuICAgICAgJCgndGltZVtkYXRldGltZV0nKS5lYWNoIC0+XHJcbiAgICAgICAgZGF0ZSA9IG1vbWVudC51dGMgJCh0aGlzKS5hdHRyICdkYXRldGltZSdcclxuICAgICAgICBkaWZmID0gbW9tZW50KCkuZGlmZiBkYXRlICwgJ2RheXMnXHJcbiAgICAgICAgaWYgZGlmZiA+IDI1XHJcbiAgICAgICAgICAkKHRoaXMpLnRleHQgZGF0ZS5sb2NhbCgpLmZvcm1hdCAnWVlZWS1NTS1ERCdcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAkKHRoaXMpLnRleHQgZGF0ZS5mcm9tTm93KClcclxuICAgICAgICAkKHRoaXMpLmF0dHIgJ3RpdGxlJywgZGF0ZS5sb2NhbCgpLmZvcm1hdCAnZGRkZCwgTU1NTSBEbyBZWVlZLCBISDptbTpzcyBaJ1xyXG4gICAgICBzZXRUaW1lb3V0IGFyZ3VtZW50cy5jYWxsZWUsIDEwMDAgKiA0NVxyXG4gICAgcmVjYWxjdWxhdGUoKVxyXG5cclxuXHJcbndpbmRvdy5pbml0X2Fubm91bmNlbWVudCA9IC0+XHJcbiAgJCgnLmFsZXJ0LWFubm91bmNlbWVudCBidXR0b24uY2xvc2UnKS5jbGljayAtPlxyXG4gICAgc2Vzc2lvblN0b3JhZ2U/LnNldEl0ZW0gJ2Nsb3NlZEFubm91bmNlbWVudCcsICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5odG1sKClcclxuXHJcbiAgaWYgc2Vzc2lvblN0b3JhZ2U/LmdldEl0ZW0oJ2Nsb3NlZEFubm91bmNlbWVudCcpICE9ICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5odG1sKClcclxuICAgICQoJy5hbGVydC1hbm5vdW5jZW1lbnQnKS5zaG93KClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9yb3dfbGluayA9IC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcucm93LWxpbmsnLCAtPlxyXG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAkKHRoaXMpLmRhdGEgJ2hyZWYnXHJcblxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLm5vdC1saW5rJywgKGUpIC0+XHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcblxyXG5cclxud2luZG93LmNsZWFyX25vdGlmaWNhdGlvbnMgPSAtPlxyXG4gICQoJyNub3RpZmljYXRpb25zJykuZW1wdHkoKVxyXG5cclxuXHJcbndpbmRvdy5zaG93X25vdGlmaWNhdGlvbiA9IChtZXNzYWdlLCBjYXRlZ29yeT0nd2FybmluZycpIC0+XHJcbiAgY2xlYXJfbm90aWZpY2F0aW9ucygpXHJcbiAgcmV0dXJuIGlmIG5vdCBtZXNzYWdlXHJcblxyXG4gICQoJyNub3RpZmljYXRpb25zJykuYXBwZW5kIFwiXCJcIlxyXG4gICAgICA8ZGl2IGNsYXNzPVwiYWxlcnQgYWxlcnQtZGlzbWlzc2FibGUgYWxlcnQtI3tjYXRlZ29yeX1cIj5cclxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNsb3NlXCIgZGF0YS1kaXNtaXNzPVwiYWxlcnRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj4mdGltZXM7PC9idXR0b24+XHJcbiAgICAgICAgI3ttZXNzYWdlfVxyXG4gICAgICA8L2Rpdj5cclxuICAgIFwiXCJcIlxyXG5cclxuXHJcbndpbmRvdy5zaXplX2h1bWFuID0gKG5ieXRlcykgLT5cclxuICBmb3Igc3VmZml4IGluIFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddXHJcbiAgICBpZiBuYnl0ZXMgPCAxMDAwXHJcbiAgICAgIGlmIHN1ZmZpeCA9PSAnQidcclxuICAgICAgICByZXR1cm4gXCIje25ieXRlc30gI3tzdWZmaXh9XCJcclxuICAgICAgcmV0dXJuIFwiI3twYXJzZUludChuYnl0ZXMgKiAxMCkgLyAxMH0gI3tzdWZmaXh9XCJcclxuICAgIG5ieXRlcyAvPSAxMDI0LjBcclxuIiwiJCAtPlxyXG4gIGluaXRfY29tbW9uKClcclxuXHJcbiQgLT4gJCgnaHRtbC5hdXRoJykuZWFjaCAtPlxyXG4gIGluaXRfYXV0aCgpXHJcblxyXG4kIC0+ICQoJ2h0bWwudXNlci1saXN0JykuZWFjaCAtPlxyXG4gIGluaXRfdXNlcl9saXN0KClcclxuXHJcbiQgLT4gJCgnaHRtbC51c2VyLW1lcmdlJykuZWFjaCAtPlxyXG4gIGluaXRfdXNlcl9tZXJnZSgpXHJcblxyXG4kIC0+ICQoJ2h0bWwucmVzb3VyY2UtbGlzdCcpLmVhY2ggLT5cclxuICBpbml0X3Jlc291cmNlX2xpc3QoKVxyXG5cclxuJCAtPiAkKCdodG1sLnJlc291cmNlLXZpZXcnKS5lYWNoIC0+XHJcbiAgaW5pdF9yZXNvdXJjZV92aWV3KClcclxuXHJcbiQgLT4gJCgnaHRtbC5wb3N0LWNyZWF0ZScpLmVhY2ggLT5cclxuICBpbml0X3Jlc291cmNlX3VwbG9hZCgpXHJcblxyXG4kIC0+ICQoJ2h0bWwucmVjb21tZW5kZXItY3JlYXRlJykuZWFjaCAtPlxyXG4gIGluaXRfcmVzb3VyY2VfdXBsb2FkKClcclxuXHJcbiIsIndpbmRvdy5pbml0X2F1dGggPSAtPlxyXG4gICQoJy5yZW1lbWJlcicpLmNoYW5nZSAtPlxyXG4gICAgYnV0dG9ucyA9ICQoJy5idG4tc29jaWFsJykudG9BcnJheSgpLmNvbmNhdCAkKCcuYnRuLXNvY2lhbC1pY29uJykudG9BcnJheSgpXHJcbiAgICBmb3IgYnV0dG9uIGluIGJ1dHRvbnNcclxuICAgICAgaHJlZiA9ICQoYnV0dG9uKS5wcm9wICdocmVmJ1xyXG4gICAgICBpZiAkKCcucmVtZW1iZXIgaW5wdXQnKS5pcyAnOmNoZWNrZWQnXHJcbiAgICAgICAgJChidXR0b24pLnByb3AgJ2hyZWYnLCBcIiN7aHJlZn0mcmVtZW1iZXI9dHJ1ZVwiXHJcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgICQoYnV0dG9uKS5wcm9wICdocmVmJywgaHJlZi5yZXBsYWNlICcmcmVtZW1iZXI9dHJ1ZScsICcnXHJcbiAgICAgICAgJCgnI3JlbWVtYmVyJykucHJvcCAnY2hlY2tlZCcsIGZhbHNlXHJcblxyXG4gICQoJy5yZW1lbWJlcicpLmNoYW5nZSgpXHJcbiIsIiMgaHR0cDovL2Jsb2cuYW5vcmdhbi5jb20vMjAxMi8wOS8zMC9wcmV0dHktbXVsdGktZmlsZS11cGxvYWQtYm9vdHN0cmFwLWpxdWVyeS10d2lnLXNpbGV4L1xyXG5pZiAkKFwiLnByZXR0eS1maWxlXCIpLmxlbmd0aFxyXG4gICQoXCIucHJldHR5LWZpbGVcIikuZWFjaCAoKSAtPlxyXG4gICAgcHJldHR5X2ZpbGUgPSAkKHRoaXMpXHJcbiAgICBmaWxlX2lucHV0ID0gcHJldHR5X2ZpbGUuZmluZCgnaW5wdXRbdHlwZT1cImZpbGVcIl0nKVxyXG4gICAgZmlsZV9pbnB1dC5oaWRlKClcclxuICAgIGZpbGVfaW5wdXQuY2hhbmdlICgpIC0+XHJcbiAgICAgIGZpbGVzID0gZmlsZV9pbnB1dFswXS5maWxlc1xyXG4gICAgICBpbmZvID0gXCJcIlxyXG4gICAgICBpZiBmaWxlcy5sZW5ndGggPiAxXHJcbiAgICAgICAgaW5mbyA9IFwiI3tmaWxlcy5sZW5ndGh9IGZpbGVzIHNlbGVjdGVkXCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIHBhdGggPSBmaWxlX2lucHV0LnZhbCgpLnNwbGl0KFwiXFxcXFwiKVxyXG4gICAgICAgIGluZm8gPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV1cclxuICAgICAgcHJldHR5X2ZpbGUuZmluZChcIi5pbnB1dC1ncm91cCBpbnB1dFwiKS52YWwoaW5mbylcclxuICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXBcIikuY2xpY2sgKGUpIC0+XHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBmaWxlX2lucHV0LmNsaWNrKClcclxuICAgICAgJCh0aGlzKS5ibHVyKClcclxuIiwid2luZG93LmluaXRfcmVzb3VyY2VfbGlzdCA9ICgpIC0+XHJcbiAgaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uKClcclxuXHJcbndpbmRvdy5pbml0X3Jlc291cmNlX3ZpZXcgPSAoKSAtPlxyXG4gIGluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbigpXHJcblxyXG53aW5kb3cuaW5pdF9yZXNvdXJjZV91cGxvYWQgPSAoKSAtPlxyXG5cclxuICBpZiB3aW5kb3cuRmlsZSBhbmQgd2luZG93LkZpbGVMaXN0IGFuZCB3aW5kb3cuRmlsZVJlYWRlclxyXG4gICAgd2luZG93LmZpbGVfdXBsb2FkZXIgPSBuZXcgRmlsZVVwbG9hZGVyXHJcbiAgICAgIHVwbG9hZF9oYW5kbGVyOiB1cGxvYWRfaGFuZGxlclxyXG4gICAgICBzZWxlY3RvcjogJCgnLmZpbGUnKVxyXG4gICAgICBkcm9wX2FyZWE6ICQoJy5kcm9wLWFyZWEnKVxyXG4gICAgICBjb25maXJtX21lc3NhZ2U6ICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xyXG4gICAgICB1cGxvYWRfdXJsOiAkKCcuZmlsZScpLmRhdGEoJ2dldC11cGxvYWQtdXJsJylcclxuICAgICAgYWxsb3dlZF90eXBlczogW11cclxuICAgICAgbWF4X3NpemU6IDEwMjQgKiAxMDI0ICogMTAyNFxyXG5cclxudXBsb2FkX2hhbmRsZXIgPVxyXG4gIHByZXZpZXc6IChmaWxlKSAtPlxyXG4gICAgJHJlc291cmNlID0gJCBcIlwiXCJcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLWxnLTIgY29sLW1kLTMgY29sLXNtLTQgY29sLXhzLTZcIj5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0aHVtYm5haWxcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXZpZXdcIj48L2Rpdj5cclxuICAgICAgICAgICAgPGg1PiN7ZmlsZS5uYW1lfTwvaDU+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1iYXJcIiBzdHlsZT1cIndpZHRoOiAwJTtcIj48L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtdGV4dFwiPjwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICBcIlwiXCJcclxuICAgICRwcmV2aWV3ID0gJCgnLnByZXZpZXcnLCAkcmVzb3VyY2UpXHJcblxyXG4gICAgaWYgZmlsZV91cGxvYWRlci5hY3RpdmVfZmlsZXMgPCAxNiBhbmQgZmlsZS50eXBlLmluZGV4T2YoXCJpbWFnZVwiKSBpcyAwXHJcbiAgICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgICAgcmVhZGVyLm9ubG9hZCA9IChlKSA9PlxyXG4gICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7ZS50YXJnZXQucmVzdWx0fSlcIilcclxuICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSlcclxuICAgIGVsc2VcclxuICAgICAgJHByZXZpZXcudGV4dChmaWxlLnR5cGUgb3IgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpXHJcblxyXG4gICAgJCgnLnJlc291cmNlLXVwbG9hZHMnKS5wcmVwZW5kKCRyZXNvdXJjZSlcclxuXHJcbiAgICAocHJvZ3Jlc3MsIHJlc291cmNlLCBlcnJvcikgPT5cclxuICAgICAgaWYgZXJyb3JcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItZGFuZ2VyJylcclxuICAgICAgICBpZiBlcnJvciA9PSAndG9vX2JpZydcclxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiRmFpbGVkISBUb28gYmlnLCBtYXg6ICN7c2l6ZV9odW1hbihmaWxlX3VwbG9hZGVyLm1heF9zaXplKX0uXCIpXHJcbiAgICAgICAgZWxzZSBpZiBlcnJvciA9PSAnd3JvbmdfdHlwZSdcclxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiRmFpbGVkISBXcm9uZyBmaWxlIHR5cGUuXCIpXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoJ0ZhaWxlZCEnKVxyXG4gICAgICAgIHJldHVyblxyXG5cclxuICAgICAgaWYgcHJvZ3Jlc3MgPT0gMTAwLjAgYW5kIHJlc291cmNlXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuYWRkQ2xhc3MoJ3Byb2dyZXNzLWJhci1zdWNjZXNzJylcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIlN1Y2Nlc3MgI3tzaXplX2h1bWFuKGZpbGUuc2l6ZSl9XCIpXHJcbiAgICAgICAgaWYgcmVzb3VyY2UuaW1hZ2VfdXJsIGFuZCAkcHJldmlldy50ZXh0KCkubGVuZ3RoID4gMFxyXG4gICAgICAgICAgJHByZXZpZXcuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgXCJ1cmwoI3tyZXNvdXJjZS5pbWFnZV91cmx9KVwiKVxyXG4gICAgICAgICAgJHByZXZpZXcudGV4dCgnJylcclxuICAgICAgZWxzZSBpZiBwcm9ncmVzcyA9PSAxMDAuMFxyXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCAnMTAwJScpXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCIxMDAlIC0gUHJvY2Vzc2luZy4uXCIpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgXCIje3Byb2dyZXNzfSVcIilcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIiN7cHJvZ3Jlc3N9JSBvZiAje3NpemVfaHVtYW4oZmlsZS5zaXplKX1cIilcclxuXHJcblxyXG53aW5kb3cuaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uID0gKCkgLT5cclxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tZGVsZXRlJywgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGlmIGNvbmZpcm0oJ1ByZXNzIE9LIHRvIGRlbGV0ZSB0aGUgcmVzb3VyY2UnKVxyXG4gICAgICAkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcclxuICAgICAgYXBpX2NhbGwgJ0RFTEVURScsICQodGhpcykuZGF0YSgnYXBpLXVybCcpLCAoZXJyLCByZXN1bHQpID0+XHJcbiAgICAgICAgaWYgZXJyXHJcbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcclxuICAgICAgICAgIExPRyAnU29tZXRoaW5nIHdlbnQgdGVycmlibHkgd3JvbmcgZHVyaW5nIGRlbGV0ZSEnLCBlcnJcclxuICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIHRhcmdldCA9ICQodGhpcykuZGF0YSgndGFyZ2V0JylcclxuICAgICAgICByZWRpcmVjdF91cmwgPSAkKHRoaXMpLmRhdGEoJ3JlZGlyZWN0LXVybCcpXHJcbiAgICAgICAgaWYgdGFyZ2V0XHJcbiAgICAgICAgICAkKFwiI3t0YXJnZXR9XCIpLnJlbW92ZSgpXHJcbiAgICAgICAgaWYgcmVkaXJlY3RfdXJsXHJcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlZGlyZWN0X3VybCIsIndpbmRvdy5pbml0X3VzZXJfbGlzdCA9IC0+XHJcbiAgaW5pdF91c2VyX3NlbGVjdGlvbnMoKVxyXG4gIGluaXRfdXNlcl9kZWxldGVfYnRuKClcclxuICBpbml0X3VzZXJfbWVyZ2VfYnRuKClcclxuXHJcblxyXG5pbml0X3VzZXJfc2VsZWN0aW9ucyA9IC0+XHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cclxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXHJcblxyXG4gICQoJyNzZWxlY3QtYWxsJykuY2hhbmdlIC0+XHJcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykucHJvcCAnY2hlY2tlZCcsICQodGhpcykuaXMgJzpjaGVja2VkJ1xyXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cclxuICAgICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcclxuXHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAtPlxyXG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcclxuXHJcblxyXG51c2VyX3NlbGVjdF9yb3cgPSAoJGVsZW1lbnQpIC0+XHJcbiAgdXBkYXRlX3VzZXJfc2VsZWN0aW9ucygpXHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cclxuICAgIGlkID0gJGVsZW1lbnQudmFsKClcclxuICAgICQoXCIjI3tpZH1cIikudG9nZ2xlQ2xhc3MgJ3dhcm5pbmcnLCAkZWxlbWVudC5pcyAnOmNoZWNrZWQnXHJcblxyXG5cclxudXBkYXRlX3VzZXJfc2VsZWN0aW9ucyA9IC0+XHJcbiAgc2VsZWN0ZWQgPSAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcclxuICAkKCcjdXNlci1hY3Rpb25zJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkID09IDBcclxuICAkKCcjdXNlci1tZXJnZScpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA8IDJcclxuICBpZiBzZWxlY3RlZCBpcyAwXHJcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdjaGVja2VkJywgZmFsc2VcclxuICBlbHNlIGlmICQoJ2lucHV0W25hbWU9dXNlcl9kYl06bm90KDpjaGVja2VkKScpLmxlbmd0aCBpcyAwXHJcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdjaGVja2VkJywgdHJ1ZVxyXG4gIGVsc2VcclxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnaW5kZXRlcm1pbmF0ZScsIHRydWVcclxuXHJcblxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiMgRGVsZXRlIFVzZXJzIFN0dWZmXHJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuaW5pdF91c2VyX2RlbGV0ZV9idG4gPSAtPlxyXG4gICQoJyN1c2VyLWRlbGV0ZScpLmNsaWNrIChlKSAtPlxyXG4gICAgY2xlYXJfbm90aWZpY2F0aW9ucygpXHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGNvbmZpcm1fbWVzc2FnZSA9ICgkKHRoaXMpLmRhdGEgJ2NvbmZpcm0nKS5yZXBsYWNlICd7dXNlcnN9JywgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykubGVuZ3RoXHJcbiAgICBpZiBjb25maXJtIGNvbmZpcm1fbWVzc2FnZVxyXG4gICAgICB1c2VyX2tleXMgPSBbXVxyXG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XHJcbiAgICAgICAgJCh0aGlzKS5hdHRyICdkaXNhYmxlZCcsIHRydWVcclxuICAgICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXHJcbiAgICAgIGRlbGV0ZV91cmwgPSAkKHRoaXMpLmRhdGEgJ2FwaS11cmwnXHJcbiAgICAgIHN1Y2Nlc3NfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnc3VjY2VzcydcclxuICAgICAgZXJyb3JfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnZXJyb3InXHJcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCBkZWxldGVfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXMuam9pbignLCcpfSwgKGVyciwgcmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIGVyclxyXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpkaXNhYmxlZCcpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xyXG4gICAgICAgICAgc2hvd19ub3RpZmljYXRpb24gZXJyb3JfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdkYW5nZXInXHJcbiAgICAgICAgICByZXR1cm5cclxuICAgICAgICAkKFwiIyN7cmVzdWx0LmpvaW4oJywgIycpfVwiKS5mYWRlT3V0IC0+XHJcbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpXHJcbiAgICAgICAgICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcclxuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIHN1Y2Nlc3NfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdzdWNjZXNzJ1xyXG5cclxuXHJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuIyBNZXJnZSBVc2VycyBTdHVmZlxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbndpbmRvdy5pbml0X3VzZXJfbWVyZ2UgPSAtPlxyXG4gIHVzZXJfa2V5cyA9ICQoJyN1c2VyX2tleXMnKS52YWwoKVxyXG4gIGFwaV91cmwgPSAkKCcuYXBpLXVybCcpLmRhdGEgJ2FwaS11cmwnXHJcbiAgYXBpX2NhbGwgJ0dFVCcsIGFwaV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5c30sIChlcnJvciwgcmVzdWx0KSAtPlxyXG4gICAgaWYgZXJyb3JcclxuICAgICAgTE9HICdTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZydcclxuICAgICAgcmV0dXJuXHJcbiAgICB3aW5kb3cudXNlcl9kYnMgPSByZXN1bHRcclxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcclxuXHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAoZXZlbnQpIC0+XHJcbiAgICB1c2VyX2tleSA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKClcclxuICAgIHNlbGVjdF9kZWZhdWx0X3VzZXIgdXNlcl9rZXlcclxuXHJcblxyXG5zZWxlY3RfZGVmYXVsdF91c2VyID0gKHVzZXJfa2V5KSAtPlxyXG4gICQoJy51c2VyLXJvdycpLnJlbW92ZUNsYXNzKCdzdWNjZXNzJykuYWRkQ2xhc3MgJ2RhbmdlcidcclxuICAkKFwiIyN7dXNlcl9rZXl9XCIpLnJlbW92ZUNsYXNzKCdkYW5nZXInKS5hZGRDbGFzcyAnc3VjY2VzcydcclxuXHJcbiAgZm9yIHVzZXJfZGIgaW4gdXNlcl9kYnNcclxuICAgIGlmIHVzZXJfa2V5ID09IHVzZXJfZGIua2V5XHJcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9rZXldJykudmFsIHVzZXJfZGIua2V5XHJcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcm5hbWVdJykudmFsIHVzZXJfZGIudXNlcm5hbWVcclxuICAgICAgJCgnaW5wdXRbbmFtZT1uYW1lXScpLnZhbCB1c2VyX2RiLm5hbWVcclxuICAgICAgJCgnaW5wdXRbbmFtZT1lbWFpbF0nKS52YWwgdXNlcl9kYi5lbWFpbFxyXG4gICAgICBicmVha1xyXG5cclxuXHJcbmluaXRfdXNlcl9tZXJnZV9idG4gPSAtPlxyXG4gICQoJyN1c2VyLW1lcmdlJykuY2xpY2sgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIHVzZXJfa2V5cyA9IFtdXHJcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XHJcbiAgICAgIHVzZXJfa2V5cy5wdXNoICQodGhpcykudmFsKClcclxuICAgIHVzZXJfbWVyZ2VfdXJsID0gJCh0aGlzKS5kYXRhICd1c2VyLW1lcmdlLXVybCdcclxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gXCIje3VzZXJfbWVyZ2VfdXJsfT91c2VyX2tleXM9I3t1c2VyX2tleXMuam9pbignLCcpfVwiXHJcbiIsIlxyXG5mdW5jdGlvbiBmb2xsb3dGdW5jdGlvbih4LCB5KSB7XHJcblxyXG4gICAgYXBpX3VybCA9ICcvYXBpL3YxL2ZvbGxvdy8nICsgeSArICcvJztcclxuXHJcbiAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImxhYmVsLWRlZmF1bHRcIikpe1xyXG4gICAgICAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcIm5vdC1sb2dnZWQtaW5cIikpe1xyXG4vLyAgICAgICAgICAgICQoXCIjbG9naW5mb3JtXCIpLmNzcyh7XCJ2aXNpYmlsaXR5XCI6XCJ2aXNpYmxlXCIsXCJkaXNwbGF5XCI6XCJibG9ja1wifSk7XHJcbiAgICAgICAgICAgICQoXCIucmVjb21tZW5kZXJcIikuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xyXG4gICAgICAgICAgICAkKFwiI2xvZ2luZm9ybVwiKS5mYWRlSW4oKTtcclxuLy8gICAgICAgICAgICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZU91dCgpO1xyXG4gICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwibGFiZWwtZGVmYXVsdFwiKVxyXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJsYWJlbC1zdWNjZXNzXCIpXHJcbiAgICAgICAgICAgIHguaW5uZXJIVE1MPSdGT0xMT1dJTkcnO1xyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFwaV91cmwsICAgIC8vWW91ciBhcGkgdXJsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdQVVQnLCAgIC8vdHlwZSBpcyBhbnkgSFRUUCBtZXRob2RcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgICAgICAvL0RhdGEgYXMganMgb2JqZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgO1xyXG4gICAgICAgICB9XHJcblxyXG4gICAgfSBlbHNlIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibGFiZWwtc3VjY2Vzc1wiKSl7XHJcblxyXG4gICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImxhYmVsLXN1Y2Nlc3NcIilcclxuICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJsYWJlbC1kZWZhdWx0XCIpXHJcbiAgICAgICAgeC5pbm5lckhUTUwgPSAnRk9MTE9XJztcclxuICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnREVMRVRFJyxcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3VsdFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICA7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG4kKCcuY2xvc2UtaWNvbicpLm9uKCdjbGljaycsZnVuY3Rpb24oKSB7XHJcbiAgJCh0aGlzKS5jbG9zZXN0KCcuY2FyZCcpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcclxuICAkKFwiLnJlY29tbWVuZGVyXCIpLmZhZGVJbigpO1xyXG59KSIsIi8vKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsZmFjdG9yeSl7aWYodHlwZW9mIGV4cG9ydHM9PT1cIm9iamVjdFwiJiZ0eXBlb2YgbW9kdWxlPT09XCJvYmplY3RcIiltb2R1bGUuZXhwb3J0cz1mYWN0b3J5KCk7ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kKWRlZmluZShcIkdpZmZmZXJcIixbXSxmYWN0b3J5KTtlbHNlIGlmKHR5cGVvZiBleHBvcnRzPT09XCJvYmplY3RcIilleHBvcnRzW1wiR2lmZmZlclwiXT1mYWN0b3J5KCk7ZWxzZSByb290W1wiR2lmZmZlclwiXT1mYWN0b3J5KCl9KSh0aGlzLGZ1bmN0aW9uKCl7dmFyIGQ9ZG9jdW1lbnQ7dmFyIHBsYXlTaXplPTYwO3ZhciBHaWZmZmVyPWZ1bmN0aW9uKG9wdGlvbnMpe3ZhciBpbWFnZXMsaT0wLGdpZnM9W107aW1hZ2VzPWQucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLWdpZmZmZXJdXCIpO2Zvcig7aTxpbWFnZXMubGVuZ3RoOysraSlwcm9jZXNzKGltYWdlc1tpXSxnaWZzLG9wdGlvbnMpO3JldHVybiBnaWZzfTtmdW5jdGlvbiBmb3JtYXRVbml0KHYpe3JldHVybiB2Kyh2LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MD9cIlwiOlwicHhcIil9ZnVuY3Rpb24gcGFyc2VTdHlsZXMoc3R5bGVzKXt2YXIgc3R5bGVzU3RyPVwiXCI7Zm9yKHByb3AgaW4gc3R5bGVzKXN0eWxlc1N0cis9cHJvcCtcIjpcIitzdHlsZXNbcHJvcF0rXCI7XCI7cmV0dXJuIHN0eWxlc1N0cn1mdW5jdGlvbiBjcmVhdGVDb250YWluZXIodyxoLGVsLGFsdFRleHQsb3B0cyl7dmFyIGFsdDt2YXIgY29uPWQuY3JlYXRlRWxlbWVudChcIkJVVFRPTlwiKTt2YXIgY2xzPWVsLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpO3ZhciBpZD1lbC5nZXRBdHRyaWJ1dGUoXCJpZFwiKTt2YXIgcGxheUJ1dHRvblN0eWxlcz1vcHRzJiZvcHRzLnBsYXlCdXR0b25TdHlsZXM/cGFyc2VTdHlsZXMob3B0cy5wbGF5QnV0dG9uU3R5bGVzKTpbXCJ3aWR0aDpcIitwbGF5U2l6ZStcInB4XCIsXCJoZWlnaHQ6XCIrcGxheVNpemUrXCJweFwiLFwiYm9yZGVyLXJhZGl1czpcIitwbGF5U2l6ZS8yK1wicHhcIixcImJhY2tncm91bmQ6cmdiYSgwLCAwLCAwLCAwLjMpXCIsXCJwb3NpdGlvbjphYnNvbHV0ZVwiLFwidG9wOjUwJVwiLFwibGVmdDo1MCVcIixcIm1hcmdpbjotXCIrcGxheVNpemUvMitcInB4XCJdLmpvaW4oXCI7XCIpO3ZhciBwbGF5QnV0dG9uSWNvblN0eWxlcz1vcHRzJiZvcHRzLnBsYXlCdXR0b25JY29uU3R5bGVzP3BhcnNlU3R5bGVzKG9wdHMucGxheUJ1dHRvbkljb25TdHlsZXMpOltcIndpZHRoOiAwXCIsXCJoZWlnaHQ6IDBcIixcImJvcmRlci10b3A6IDE0cHggc29saWQgdHJhbnNwYXJlbnRcIixcImJvcmRlci1ib3R0b206IDE0cHggc29saWQgdHJhbnNwYXJlbnRcIixcImJvcmRlci1sZWZ0OiAxNHB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC41KVwiLFwicG9zaXRpb246IGFic29sdXRlXCIsXCJsZWZ0OiAyNnB4XCIsXCJ0b3A6IDE2cHhcIl0uam9pbihcIjtcIik7Y2xzP2Nvbi5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLGVsLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpKTpudWxsO2lkP2Nvbi5zZXRBdHRyaWJ1dGUoXCJpZFwiLGVsLmdldEF0dHJpYnV0ZShcImlkXCIpKTpudWxsO2Nvbi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwicG9zaXRpb246cmVsYXRpdmU7Y3Vyc29yOnBvaW50ZXI7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO3BhZGRpbmc6MDtcIik7Y29uLnNldEF0dHJpYnV0ZShcImFyaWEtaGlkZGVuXCIsXCJ0cnVlXCIpO3ZhciBwbGF5PWQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtwbGF5LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCJnaWZmZmVyLXBsYXktYnV0dG9uXCIpO3BsYXkuc2V0QXR0cmlidXRlKFwic3R5bGVcIixwbGF5QnV0dG9uU3R5bGVzKTt2YXIgdHJuZ2w9ZC5jcmVhdGVFbGVtZW50KFwiRElWXCIpO3RybmdsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIscGxheUJ1dHRvbkljb25TdHlsZXMpO3BsYXkuYXBwZW5kQ2hpbGQodHJuZ2wpO2lmKGFsdFRleHQpe2FsdD1kLmNyZWF0ZUVsZW1lbnQoXCJwXCIpO2FsdC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLFwiZ2lmZmZlci1hbHRcIik7YWx0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJib3JkZXI6MDtjbGlwOnJlY3QoMCAwIDAgMCk7aGVpZ2h0OjFweDtvdmVyZmxvdzpoaWRkZW47cGFkZGluZzowO3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjFweDtcIik7YWx0LmlubmVyVGV4dD1hbHRUZXh0K1wiLCBpbWFnZVwifWNvbi5hcHBlbmRDaGlsZChwbGF5KTtlbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjb24sZWwpO2FsdFRleHQ/Y29uLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGFsdCxjb24ubmV4dFNpYmxpbmcpOm51bGw7cmV0dXJue2M6Y29uLHA6cGxheX19ZnVuY3Rpb24gY2FsY3VsYXRlUGVyY2VudGFnZURpbShlbCx3LGgsd09yaWcsaE9yaWcpe3ZhciBwYXJlbnREaW1XPWVsLnBhcmVudE5vZGUub2Zmc2V0V2lkdGg7dmFyIHBhcmVudERpbUg9ZWwucGFyZW50Tm9kZS5vZmZzZXRIZWlnaHQ7dmFyIHJhdGlvPXdPcmlnL2hPcmlnO2lmKHcudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXt3PXBhcnNlSW50KHcudG9TdHJpbmcoKS5yZXBsYWNlKFwiJVwiLFwiXCIpKTt3PXcvMTAwKnBhcmVudERpbVc7aD13L3JhdGlvfWVsc2UgaWYoaC50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2g9cGFyc2VJbnQoaC50b1N0cmluZygpLnJlcGxhY2UoXCIlXCIsXCJcIikpO2g9aC8xMDAqcGFyZW50RGltVzt3PWgvcmF0aW99cmV0dXJue3c6dyxoOmh9fWZ1bmN0aW9uIHByb2Nlc3MoZWwsZ2lmcyxvcHRpb25zKXt2YXIgdXJsLGNvbixjLHcsaCxkdXJhdGlvbixwbGF5LGdpZixwbGF5aW5nPWZhbHNlLGNjLGlzQyxkdXJhdGlvblRpbWVvdXQsZGltcyxhbHRUZXh0O3VybD1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXJcIik7dz1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItd2lkdGhcIik7aD1lbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWdpZmZmZXItaGVpZ2h0XCIpO2R1cmF0aW9uPWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci1kdXJhdGlvblwiKTthbHRUZXh0PWVsLmdldEF0dHJpYnV0ZShcImRhdGEtZ2lmZmZlci1hbHRcIik7ZWwuc3R5bGUuZGlzcGxheT1cImJsb2NrXCI7Yz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO2lzQz0hIShjLmdldENvbnRleHQmJmMuZ2V0Q29udGV4dChcIjJkXCIpKTtpZih3JiZoJiZpc0MpY2M9Y3JlYXRlQ29udGFpbmVyKHcsaCxlbCxhbHRUZXh0LG9wdGlvbnMpO2VsLm9ubG9hZD1mdW5jdGlvbigpe2lmKCFpc0MpcmV0dXJuO3c9d3x8ZWwud2lkdGg7aD1ofHxlbC5oZWlnaHQ7aWYoIWNjKWNjPWNyZWF0ZUNvbnRhaW5lcih3LGgsZWwsYWx0VGV4dCxvcHRpb25zKTtjb249Y2MuYztwbGF5PWNjLnA7ZGltcz1jYWxjdWxhdGVQZXJjZW50YWdlRGltKGNvbix3LGgsZWwud2lkdGgsZWwuaGVpZ2h0KTtnaWZzLnB1c2goY29uKTtjb24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsZnVuY3Rpb24oKXtjbGVhclRpbWVvdXQoZHVyYXRpb25UaW1lb3V0KTtpZighcGxheWluZyl7cGxheWluZz10cnVlO2dpZj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiSU1HXCIpO2dpZi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwid2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtcIik7Z2lmLnNldEF0dHJpYnV0ZShcImRhdGEtdXJpXCIsTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjFlNSkrMSk7c2V0VGltZW91dChmdW5jdGlvbigpe2dpZi5zcmM9dXJsfSwwKTtjb24ucmVtb3ZlQ2hpbGQocGxheSk7Y29uLnJlbW92ZUNoaWxkKGMpO2Nvbi5hcHBlbmRDaGlsZChnaWYpO2lmKHBhcnNlSW50KGR1cmF0aW9uKT4wKXtkdXJhdGlvblRpbWVvdXQ9c2V0VGltZW91dChmdW5jdGlvbigpe3BsYXlpbmc9ZmFsc2U7Y29uLmFwcGVuZENoaWxkKHBsYXkpO2Nvbi5yZW1vdmVDaGlsZChnaWYpO2Nvbi5hcHBlbmRDaGlsZChjKTtnaWY9bnVsbH0sZHVyYXRpb24pfX1lbHNle3BsYXlpbmc9ZmFsc2U7Y29uLmFwcGVuZENoaWxkKHBsYXkpO2Nvbi5yZW1vdmVDaGlsZChnaWYpO2Nvbi5hcHBlbmRDaGlsZChjKTtnaWY9bnVsbH19KTtjLndpZHRoPWRpbXMudztjLmhlaWdodD1kaW1zLmg7Yy5nZXRDb250ZXh0KFwiMmRcIikuZHJhd0ltYWdlKGVsLDAsMCxkaW1zLncsZGltcy5oKTtjb24uYXBwZW5kQ2hpbGQoYyk7Y29uLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJwb3NpdGlvbjpyZWxhdGl2ZTtjdXJzb3I6cG9pbnRlcjt3aWR0aDpcIitkaW1zLncrXCJweDtoZWlnaHQ6XCIrZGltcy5oK1wicHg7YmFja2dyb3VuZDpub25lO2JvcmRlcjpub25lO3BhZGRpbmc6MDtcIik7Yy5zdHlsZS53aWR0aD1cIjEwMCVcIjtjLnN0eWxlLmhlaWdodD1cIjEwMCVcIjtpZih3LnRvU3RyaW5nKCkuaW5kZXhPZihcIiVcIik+MCYmaC50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2Nvbi5zdHlsZS53aWR0aD13O2Nvbi5zdHlsZS5oZWlnaHQ9aH1lbHNlIGlmKHcudG9TdHJpbmcoKS5pbmRleE9mKFwiJVwiKT4wKXtjb24uc3R5bGUud2lkdGg9dztjb24uc3R5bGUuaGVpZ2h0PVwiaW5oZXJpdFwifWVsc2UgaWYoaC50b1N0cmluZygpLmluZGV4T2YoXCIlXCIpPjApe2Nvbi5zdHlsZS53aWR0aD1cImluaGVyaXRcIjtjb24uc3R5bGUuaGVpZ2h0PWh9ZWxzZXtjb24uc3R5bGUud2lkdGg9ZGltcy53K1wicHhcIjtjb24uc3R5bGUuaGVpZ2h0PWRpbXMuaCtcInB4XCJ9fTtlbC5zcmM9dXJsfXJldHVybiBHaWZmZmVyfSk7XHJcbiIsIi8vIEZvbGxvd2luZyBjb2RlIGFkZHMgdHlwZWFoZWFkIGtleXdvcmRzIHRvIHNlYXJjaCBiYXJzXHJcblxyXG52YXIga2V5d29yZHMgPSBuZXcgQmxvb2Rob3VuZCh7XHJcbiAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXHJcbiAgICBxdWVyeVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLndoaXRlc3BhY2UsXHJcbiAgICBwcmVmZXRjaDoge1xyXG4gICAgdXJsOiAnL2tleXdvcmRzJyxcclxuICAgIGZpbHRlcjogZnVuY3Rpb24obGlzdCkge1xyXG4gICAgICByZXR1cm4gJC5tYXAobGlzdCwgZnVuY3Rpb24oY2l0eW5hbWUpIHtcclxuICAgICAgICByZXR1cm4geyBuYW1lOiBjaXR5bmFtZSB9OyB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG59KTtcclxuXHJcbmtleXdvcmRzLmluaXRpYWxpemUoKTtcclxuXHJcbiQoJyNzZWFyY2gnKS50eXBlYWhlYWQobnVsbCwge1xyXG4gICAgIG1pbmxlbmd0aDogMSxcclxuICAgICBuYW1lOiAna2V5d29yZHMnLFxyXG4gICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcclxuICAgICB2YWx1ZUtleTogJ25hbWUnLFxyXG4gICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcclxufSk7XHJcblxyXG4kKCcjc2VhcmNoX3BhZ2UnKS50eXBlYWhlYWQobnVsbCwge1xyXG4gICAgIG1pbmxlbmd0aDogMSxcclxuICAgICBuYW1lOiAna2V5d29yZHMnLFxyXG4gICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcclxuICAgICB2YWx1ZUtleTogJ25hbWUnLFxyXG4gICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcclxufSk7XHJcblxyXG5cclxuXHJcbiQoJyNrZXl3b3JkcycpLnRhZ3NpbnB1dCh7XHJcbiAgICBjb25maXJtS2V5czogWzEzLCA0NF0sXHJcbiAgICB0eXBlYWhlYWRqczogW3tcclxuICAgICAgICAgIG1pbkxlbmd0aDogMSxcclxuICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcclxuXHJcbiAgICB9LHtcclxuICAgICAgICBtaW5sZW5ndGg6IDEsXHJcbiAgICAgICAgbmFtZTogJ2tleXdvcmRzJyxcclxuICAgICAgICBkaXNwbGF5S2V5OiAnbmFtZScsXHJcbiAgICAgICAgdmFsdWVLZXk6ICduYW1lJyxcclxuICAgICAgICBzb3VyY2U6IGtleXdvcmRzLnR0QWRhcHRlcigpXHJcbiAgICB9XSxcclxuICAgIGZyZWVJbnB1dDogdHJ1ZSxcclxuXHJcbn0pO1xyXG5cclxuJCgnI2xvY2F0aW9uX2tleXdvcmRzJykudGFnc2lucHV0KHtcclxuICAgIGNvbmZpcm1LZXlzOiBbMTMsIDQ0XSxcclxuICAgIHR5cGVhaGVhZGpzOiBbe1xyXG4gICAgICAgICAgbWluTGVuZ3RoOiAxLFxyXG4gICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxyXG5cclxuICAgIH0se1xyXG4gICAgICAgIG1pbmxlbmd0aDogMSxcclxuICAgICAgICBuYW1lOiAna2V5d29yZHMnLFxyXG4gICAgICAgIGRpc3BsYXlLZXk6ICduYW1lJyxcclxuICAgICAgICB2YWx1ZUtleTogJ25hbWUnLFxyXG4gICAgICAgIHNvdXJjZToga2V5d29yZHMudHRBZGFwdGVyKClcclxuICAgIH1dLFxyXG4gICAgZnJlZUlucHV0OiB0cnVlLFxyXG5cclxufSk7XHJcblxyXG4kKCcuZHJhYWlrbm9wamUnKS5jbGljayhmdW5jdGlvbiAoKSB7XHJcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICQoJy5ncmlkJykubWFzb25yeSgnbGF5b3V0Jyk7XHJcbiAgfSwgMTAwKTtcclxufSk7XHJcblxyXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcclxuICBHaWZmZmVyKHtcclxuICAgICAgcGxheUJ1dHRvblN0eWxlczoge1xyXG4gICAgICAgICd3aWR0aCc6ICc2MHB4JyxcclxuICAgICAgICAnaGVpZ2h0JzogJzYwcHgnLFxyXG4gICAgICAgICdib3JkZXItcmFkaXVzJzogJzMwcHgnLFxyXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJ3JnYmEoMCwgMCwgMCwgMC4zKScsXHJcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcclxuICAgICAgICAndG9wJzogJzUwJScsXHJcbiAgICAgICAgJ2xlZnQnOiAnNTAlJyxcclxuICAgICAgICAnbWFyZ2luJzogJy0zMHB4IDAgMCAtMzBweCdcclxuICAgICAgfSxcclxuICAgICAgcGxheUJ1dHRvbkljb25TdHlsZXM6IHtcclxuICAgICAgICAnd2lkdGgnOiAnMCcsXHJcbiAgICAgICAgJ2hlaWdodCc6ICcwJyxcclxuICAgICAgICAnYm9yZGVyLXRvcCc6ICcxNHB4IHNvbGlkIHRyYW5zcGFyZW50JyxcclxuICAgICAgICAnYm9yZGVyLWJvdHRvbSc6ICcxNHB4IHNvbGlkIHRyYW5zcGFyZW50JyxcclxuICAgICAgICAnYm9yZGVyLWxlZnQnOiAnMTRweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LCAwLjUpJyxcclxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICdsZWZ0JzogJzI2cHgnLFxyXG4gICAgICAgICd0b3AnOiAnMTZweCdcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgJCgnLmdyaWQnKS5tYXNvbnJ5KHtcclxuICAgICAgaXRlbVNlbGVjdG9yOiAnLmdyaWQtaXRlbScsIC8vIHVzZSBhIHNlcGFyYXRlIGNsYXNzIGZvciBpdGVtU2VsZWN0b3IsIG90aGVyIHRoYW4gLmNvbC1cclxuICAgICAgY29sdW1uV2lkdGg6ICcuZ3JpZC1zaXplcicsXHJcbiAgICAgIHBlcmNlbnRQb3NpdGlvbjogdHJ1ZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gbGF5b3V0IE1hc29ucnkgYWZ0ZXIgZWFjaCBpbWFnZSBsb2Fkc1xyXG4gICAgJCgnLmdyaWQnKS5pbWFnZXNMb2FkZWQoKS5wcm9ncmVzcyggZnVuY3Rpb24oKSB7XHJcbiAgICAgICQoJy5ncmlkJykubWFzb25yeSgnbGF5b3V0Jyk7XHJcbiAgICB9KTtcclxuXHJcbiB9KVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5mdW5jdGlvbiBlc2NhcGVIVE1MKHN0cmluZykge1xyXG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC8mL2csJyZhbXA7JykucmVwbGFjZSgvPC9nLCcmbHQ7JykucmVwbGFjZSgvPi9nLCcmZ3Q7Jyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENsZWFuTmFtZShmZWF0dXJlLCBwcm9wZXJ0eSl7XHJcbiAgICAvL3JldHVybiBzdHJpbmcgc3RpcHBlZCBvZiBodG1sIGNvZGVzXHJcbiAgICByZXR1cm4gZXNjYXBlSFRNTChmZWF0dXJlLmdldFByb3BlcnR5KHByb3BlcnR5KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEtleXdvcmRVcmxzKG1haW5VcmwsIGtleXdvcmRBcnJheSl7XHJcbiAgICAvLyBSZXR1cm5zIGEgc3RyaW5nIG9mIGh0bWwgbGlua3MgYmFzZWQgb24gYXJyYXkgb2Yga2V5d29yZHNcclxuICAgIHZhciByZXN1bHQgPSAnJztcclxuICAgIHZhciBhTGVuID0gTWF0aC5taW4oMywgIGtleXdvcmRBcnJheS5sZW5ndGgpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhTGVuOyBpKyspIHtcclxuICAgICAgaHRtbCA9IFtcclxuICAgICAgICAnPGEgY2xhc3M9XCJ0aHVtYm5haWxIYXNodGFnXCIgaHJlZj1cIicgKyBtYWluVXJsICsga2V5d29yZEFycmF5W2ldICsgJ1wiPicsXHJcbiAgICAgICAgICAgICcjJyArIGtleXdvcmRBcnJheVtpXSxcclxuICAgICAgICAgJzwvYT4nXHJcbiAgICAgIF0uam9pbihcIlxcblwiKTtcclxuICAgICAgcmVzdWx0ICs9IGh0bWw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVCb3goZmVhdHVyZSl7XHJcbiAvLyBHZW5lcmF0ZXMgdGhlIEhUTUwgY29kZSBmb3IgdGhlIG1hcCBpbmZvIHdpbmRvd1xyXG4gdmFyIHNlYXJjaF9wYWdlX3VybCA9ICcvcG9zdC9xLyc7XHJcblxyXG4gdmFyIG5hbWUgPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ25hbWUnKTtcclxuIHZhciBkZXNjcmlwdGlvbiA9IGdldENsZWFuTmFtZShmZWF0dXJlLCAnZGVzY3JpcHRpb24nKTtcclxuIHZhciBpbWFnZV91cmwgPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ2ltYWdlX3VybCcpO1xyXG4gdmFyIGxvY2F0aW9uX2tleXdvcmQgPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ2xvY2F0aW9uJyk7XHJcbiB2YXIga2V5d29yZHMgPSBnZXRDbGVhbk5hbWUoZmVhdHVyZSwgJ2tleXdvcmRzJykuc3BsaXQoJywnKTtcclxuIHZhciByZWNvbW1lbmRlciA9IGdldENsZWFuTmFtZShmZWF0dXJlLCAncmVjb21tZW5kZXInKTtcclxuIHZhciBkb2NpZCA9IGdldENsZWFuTmFtZShmZWF0dXJlLCAnZG9jaWQnKTtcclxuIHZhciB3ZWJzaXRlID0gZ2V0Q2xlYW5OYW1lKGZlYXR1cmUsICd3ZWJzaXRlJyk7XHJcbiB2YXIgYWRkcmVzcyA9IGdldENsZWFuTmFtZShmZWF0dXJlLCAnYWRkcmVzcycpO1xyXG5cclxuXHJcbiB2YXIgbG9jYXRpb25fdXJsID0gc2VhcmNoX3BhZ2VfdXJsICsgbG9jYXRpb25fa2V5d29yZDtcclxuIHZhciBrZXl3b3JkX3VybHMgPSBnZXRLZXl3b3JkVXJscyhzZWFyY2hfcGFnZV91cmwsIGtleXdvcmRzKTtcclxuIHZhciByZWNvbW1lbmRlcl91cmwgPSBzZWFyY2hfcGFnZV91cmwgKyAncmVjb21tZW5kZXI9JyArIHJlY29tbWVuZGVyLnJlcGxhY2UoJywnLCAnJyk7XHJcbiB2YXIgZ29vZ2xlX21hcHNfZGlyZWN0aW9ucyA9ICdodHRwczovL3d3dy5nb29nbGUuY29tL21hcHM/c2FkZHI9TXkrTG9jYXRpb24mZGFkZHI9JyArIGFkZHJlc3MucmVwbGFjZSgnICcsICcrJyk7XHJcblxyXG4gdmFyIGh0bWwgPSBbXHJcbiAnPGRpdiBjbGFzcz1cImJveFwiIHN0eWxlPVwibWF4LXdpZHRoOjMwMHB4O1wiPicsXHJcbiAgICAnPGltZyBjbGFzcz1cImltZy1mbHVpZFwiIGRhdGEtZ2lmZmZlcj1cIicgKyBpbWFnZV91cmwgKyAnXCI+JyxcclxuICAgICc8dWwgY2xhc3M9XCJhZGRpdGlvbmFsTGlua3NcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OjBweDtwYWRkaW5nLWxlZnQ6MHB4O3BhZGRpbmctdG9wOjNweFwiPicsXHJcbiAgICAgICAgJzxkaXY+JyxcclxuICAgICAgICAgICAgJzxpIGNsYXNzPVwiZmEgZmEtbWFwLW1hcmtlciBtYXAtbWFya2VyXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9pPicsXHJcbiAgICAgICAgICAgICc8YSBjbGFzcz1cInRodW1ibmFpbExvY2F0aW9uXCIgaHJlZj1cIicgKyBsb2NhdGlvbl91cmwgKyAnXCI+JyxcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uX2tleXdvcmQsXHJcbiAgICAgICAgICAgICAnPC9hPicsXHJcbiAgICAgICAgJzwvZGl2PicsXHJcbiAgICAgICAgJzxsaSBjbGFzcz1cImljb25MaXN0XCI+JyxcclxuICAgICAgICAgICAgJzxoMSBjbGFzcz1cInRodW1ibmFpbFRpdGxlXCI+JyArIG5hbWUgKyAnPC9oMT4nLFxyXG4gICAgICAgICAnPC9saT4nLFxyXG4gICAgJzwvdWw+JyxcclxuICAgICc8ZGl2IGNsYXNzPVwiYWRkUGFkZGluZ1wiPicgKyBrZXl3b3JkX3VybHMgKyAnPC9kaXY+JyxcclxuICAgICc8ZGl2IGNsYXNzPVwidGFiXCI+JyxcclxuICAgICAgICAnPGJyPjxhIGNsYXNzPVwibGlua1JlY29tbWVuZGVkQnlcIiBocmVmPVwiJyArIHJlY29tbWVuZGVyX3VybCArICdcIj4gQlkgJyArIHJlY29tbWVuZGVyICsgJzwvYT4nLFxyXG4gICAgICAgICc8aW5wdXQgaWQ9XCInICsgZG9jaWQgKyAnXCIgY2xhc3M9XCJoaWRkZW4gZHJhYWlrbm9wamVcIiB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwidGFic1wiPicsXHJcbiAgICAgICAgJzxsYWJlbCBmb3I9XCInICsgZG9jaWQgKyAnXCI+JyxcclxuICAgICAgICAgICAgJzx1bCBjbGFzcz1cImFkZGl0aW9uYWxMaW5rc1wiIHN0eWxlPVwibWFyZ2luLWxlZnQ6MHB4O3BhZGRpbmctbGVmdDowcHg7cGFkZGluZy10b3A6MTBweFwiPicsXHJcbiAgICAgICAgICAgICAgICAnPGxpIGNsYXNzPVwiaWNvbkxpc3RcIj48YSBocmVmPVwiJyArIHdlYnNpdGUgKyAnXCI+JyxcclxuICAgICAgICAgICAgICAgICAgICAnPGltZyBzcmM9XCIvcC9pbWcvaWNfb3Blbl9pbl9uZXdfYmxhY2tfMjRweC5wbmdcIiBjbGFzcz1cInBvc3RJY29uXCI+JyxcclxuICAgICAgICAgICAgICAgICc8L2E+PC9saT4nLFxyXG4gICAgICAgICAgICAgICAgJzxsaSBjbGFzcz1cImljb25MaXN0XCI+PGEgaHJlZj1cIicgKyBnb29nbGVfbWFwc19kaXJlY3Rpb25zICsgJ1wiPicsXHJcbiAgICAgICAgICAgICAgICAgICAgJzxpbWcgc3JjPVwiL3AvaW1nL2ljX2RpcmVjdGlvbnNfYmxhY2tfMjRweC5wbmdcIiBjbGFzcz1cInBvc3RJY29uXCI+JyxcclxuICAgICAgICAgICAgICAgICAnPC9hPjwvbGk+JyxcclxuICAgICAgICAgICAgJzwvdWw+JyxcclxuICAgICAgICAnPC9sYWJlbD4nLFxyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwidGFiLWNvbnRlbnRcIj4nLFxyXG4gICAgICAgICAgICAnPHAgY2xhc3M9XCJwTGVmdFwiPicgKyBkZXNjcmlwdGlvbiArICc8L3A+JyxcclxuICAgICAgICAnPC9kaXY+JyxcclxuICAgICc8L2Rpdj4nLFxyXG4gJzwvZGl2PidcclxuICBdO1xyXG4gcmV0dXJuIGh0bWwuam9pbihcIlxcblwiKTtcclxuXHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzUG9pbnRzKGdlb21ldHJ5LCBjYWxsYmFjaywgdGhpc0FyZykge1xyXG4gIGlmIChnZW9tZXRyeSBpbnN0YW5jZW9mIGdvb2dsZS5tYXBzLkxhdExuZykge1xyXG4gICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBnZW9tZXRyeSk7XHJcbiAgfSBlbHNlIGlmIChnZW9tZXRyeSBpbnN0YW5jZW9mIGdvb2dsZS5tYXBzLkRhdGEuUG9pbnQpIHtcclxuICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZ2VvbWV0cnkuZ2V0KCkpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBnZW9tZXRyeS5nZXRBcnJheSgpLmZvckVhY2goZnVuY3Rpb24gKGcpIHtcclxuICAgICAgcHJvY2Vzc1BvaW50cyhnLCBjYWxsYmFjaywgdGhpc0FyZyk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRNYXAoKSB7XHJcbiAgLy8gQ3JlYXRlIHRoZSBtYXAuXHJcbiAgdmFyIG1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnbWFwJylbMF0sIHtcclxuICAgIHpvb206IDcsXHJcbiAgICBjZW50ZXI6IHsgbGF0OiAwLCBsbmc6IDAgfSxcclxuICB9KTtcclxuXHJcbiAgdmFyIGJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcclxuICBtYXAuZGF0YS5hZGRMaXN0ZW5lcignYWRkZmVhdHVyZScsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICBwcm9jZXNzUG9pbnRzKGUuZmVhdHVyZS5nZXRHZW9tZXRyeSgpLCBib3VuZHMuZXh0ZW5kLCBib3VuZHMpO1xyXG5cclxuICAgIGlmIChib3VuZHMuZ2V0Tm9ydGhFYXN0KCkuZXF1YWxzKGJvdW5kcy5nZXRTb3V0aFdlc3QoKSkpIHtcclxuICAgICAgIHZhciBleHRlbmRQb2ludDEgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGJvdW5kcy5nZXROb3J0aEVhc3QoKS5sYXQoKSArIDAuMDEsIGJvdW5kcy5nZXROb3J0aEVhc3QoKS5sbmcoKSArIDAuMDEpO1xyXG4gICAgICAgdmFyIGV4dGVuZFBvaW50MiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoYm91bmRzLmdldE5vcnRoRWFzdCgpLmxhdCgpIC0gMC4wMSwgYm91bmRzLmdldE5vcnRoRWFzdCgpLmxuZygpIC0gMC4wMSk7XHJcbiAgICAgICBib3VuZHMuZXh0ZW5kKGV4dGVuZFBvaW50MSk7XHJcbiAgICAgICBib3VuZHMuZXh0ZW5kKGV4dGVuZFBvaW50Mik7XHJcbiAgICB9XHJcblxyXG4gICAgbWFwLmZpdEJvdW5kcyhib3VuZHMpO1xyXG4gIH0pO1xyXG4gIGNvbnNvbGUubG9nKHF1ZXJ5KTtcclxuXHJcbiAgYXBpX3VybCA9ICcvYXBpL3YxL3Bvc3QvJyArIHF1ZXJ5O1xyXG4gIC8vIExvYWQgdGhlIHN0b3JlcyBHZW9KU09OIG9udG8gdGhlIG1hcC5cclxuICBtYXAuZGF0YS5sb2FkR2VvSnNvbihhcGlfdXJsKTtcclxuXHJcbiAgdmFyIGFwaUtleSA9ICdBSXphU3lBYmNNR01VTGdwNWwwVHJhdjJHM09zZUlyTkdJeEhEWmsnO1xyXG4gIHZhciBpbmZvV2luZG93ID0gbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coKTtcclxuICBpbmZvV2luZG93LnNldE9wdGlvbnMoeyBwaXhlbE9mZnNldDogbmV3IGdvb2dsZS5tYXBzLlNpemUoMCwgLTMwKSB9KTtcclxuXHJcbiAgLy8gU2hvdyB0aGUgaW5mb3JtYXRpb24gZm9yIGEgc3RvcmUgd2hlbiBpdHMgbWFya2VyIGlzIGNsaWNrZWQuXHJcbiAgbWFwLmRhdGEuYWRkTGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgdmFyIHBvc2l0aW9uID0gZXZlbnQuZmVhdHVyZS5nZXRHZW9tZXRyeSgpLmdldCgpO1xyXG4gIHZhciBjb250ZW50ID0gZ2VuZXJhdGVCb3goZXZlbnQuZmVhdHVyZSk7XHJcblxyXG4gIGluZm9XaW5kb3cuc2V0Q29udGVudChjb250ZW50KTtcclxuICBpbmZvV2luZG93LnNldFBvc2l0aW9uKHBvc2l0aW9uKTtcclxuXHJcbiAgaW5mb1dpbmRvdy5vcGVuKG1hcCk7XHJcblxyXG4gICBHaWZmZmVyKHtcclxuICAgICAgcGxheUJ1dHRvblN0eWxlczoge1xyXG4gICAgICAgICd3aWR0aCc6ICc2MHB4JyxcclxuICAgICAgICAnaGVpZ2h0JzogJzYwcHgnLFxyXG4gICAgICAgICdib3JkZXItcmFkaXVzJzogJzMwcHgnLFxyXG4gICAgICAgICdiYWNrZ3JvdW5kJzogJ3JnYmEoMCwgMCwgMCwgMC4zKScsXHJcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcclxuICAgICAgICAndG9wJzogJzUwJScsXHJcbiAgICAgICAgJ2xlZnQnOiAnNTAlJyxcclxuICAgICAgICAnbWFyZ2luJzogJy0zMHB4IDAgMCAtMzBweCdcclxuICAgICAgfSxcclxuICAgICAgcGxheUJ1dHRvbkljb25TdHlsZXM6IHtcclxuICAgICAgICAnd2lkdGgnOiAnMCcsXHJcbiAgICAgICAgJ2hlaWdodCc6ICcwJyxcclxuICAgICAgICAnYm9yZGVyLXRvcCc6ICcxNHB4IHNvbGlkIHRyYW5zcGFyZW50JyxcclxuICAgICAgICAnYm9yZGVyLWJvdHRvbSc6ICcxNHB4IHNvbGlkIHRyYW5zcGFyZW50JyxcclxuICAgICAgICAnYm9yZGVyLWxlZnQnOiAnMTRweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LCAwLjUpJyxcclxuICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICdsZWZ0JzogJzI2cHgnLFxyXG4gICAgICAgICd0b3AnOiAnMTZweCdcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gIH0pO1xyXG59XHJcblxyXG4kKCcubWFwX2xpbmsnKS5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xyXG4gICQoXCIjcmVzdGF1cmFudFwiKS5jc3Moe1wiZGlzcGxheVwiOlwibm9uZVwifSk7XHJcblxyXG4gICQoXCIjbWFwXCIpLmZhZGVJbigpO1xyXG4gIGluaXRNYXAoKTtcclxuICAkKFwiYS5saXN0YVwiKS5jc3Moe1wiY29sb3JcIjpcImdyYXlcIn0pO1xyXG4gICQoXCJhLm1hcGFcIikuY3NzKHtcImNvbG9yXCI6XCJibGFja1wifSk7XHJcblxyXG5cclxufSlcclxuXHJcbiQoJy5saXN0X2xpbmsnKS5vbignY2xpY2snLGZ1bmN0aW9uKCkge1xyXG4gICQoXCIjbWFwXCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcclxuICAkKFwiI3Jlc3RhdXJhbnRcIikuZmFkZUluKCk7XHJcblxyXG4gICQoXCJhLmxpc3RhXCIpLmNzcyh7XCJjb2xvclwiOlwiYmxhY2tcIn0pO1xyXG4gICQoXCJhLm1hcGFcIikuY3NzKHtcImNvbG9yXCI6XCJncmF5XCJ9KTtcclxuXHJcbn0pIiwiLyohXHJcbiAqIE1hc29ucnkgUEFDS0FHRUQgdjQuMi4wXHJcbiAqIENhc2NhZGluZyBncmlkIGxheW91dCBsaWJyYXJ5XHJcbiAqIGh0dHA6Ly9tYXNvbnJ5LmRlc2FuZHJvLmNvbVxyXG4gKiBNSVQgTGljZW5zZVxyXG4gKiBieSBEYXZpZCBEZVNhbmRyb1xyXG4gKi9cclxuXHJcbiFmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJqcXVlcnktYnJpZGdldC9qcXVlcnktYnJpZGdldFwiLFtcImpxdWVyeVwiXSxmdW5jdGlvbihpKXtyZXR1cm4gZSh0LGkpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSh0LHJlcXVpcmUoXCJqcXVlcnlcIikpOnQualF1ZXJ5QnJpZGdldD1lKHQsdC5qUXVlcnkpfSh3aW5kb3csZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBpKGkscixhKXtmdW5jdGlvbiBoKHQsZSxuKXt2YXIgbyxyPVwiJCgpLlwiK2krJyhcIicrZSsnXCIpJztyZXR1cm4gdC5lYWNoKGZ1bmN0aW9uKHQsaCl7dmFyIHU9YS5kYXRhKGgsaSk7aWYoIXUpcmV0dXJuIHZvaWQgcyhpK1wiIG5vdCBpbml0aWFsaXplZC4gQ2Fubm90IGNhbGwgbWV0aG9kcywgaS5lLiBcIityKTt2YXIgZD11W2VdO2lmKCFkfHxcIl9cIj09ZS5jaGFyQXQoMCkpcmV0dXJuIHZvaWQgcyhyK1wiIGlzIG5vdCBhIHZhbGlkIG1ldGhvZFwiKTt2YXIgbD1kLmFwcGx5KHUsbik7bz12b2lkIDA9PT1vP2w6b30pLHZvaWQgMCE9PW8/bzp0fWZ1bmN0aW9uIHUodCxlKXt0LmVhY2goZnVuY3Rpb24odCxuKXt2YXIgbz1hLmRhdGEobixpKTtvPyhvLm9wdGlvbihlKSxvLl9pbml0KCkpOihvPW5ldyByKG4sZSksYS5kYXRhKG4saSxvKSl9KX1hPWF8fGV8fHQualF1ZXJ5LGEmJihyLnByb3RvdHlwZS5vcHRpb258fChyLnByb3RvdHlwZS5vcHRpb249ZnVuY3Rpb24odCl7YS5pc1BsYWluT2JqZWN0KHQpJiYodGhpcy5vcHRpb25zPWEuZXh0ZW5kKCEwLHRoaXMub3B0aW9ucyx0KSl9KSxhLmZuW2ldPWZ1bmN0aW9uKHQpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiB0KXt2YXIgZT1vLmNhbGwoYXJndW1lbnRzLDEpO3JldHVybiBoKHRoaXMsdCxlKX1yZXR1cm4gdSh0aGlzLHQpLHRoaXN9LG4oYSkpfWZ1bmN0aW9uIG4odCl7IXR8fHQmJnQuYnJpZGdldHx8KHQuYnJpZGdldD1pKX12YXIgbz1BcnJheS5wcm90b3R5cGUuc2xpY2Uscj10LmNvbnNvbGUscz1cInVuZGVmaW5lZFwiPT10eXBlb2Ygcj9mdW5jdGlvbigpe306ZnVuY3Rpb24odCl7ci5lcnJvcih0KX07cmV0dXJuIG4oZXx8dC5qUXVlcnkpLGl9KSxmdW5jdGlvbih0LGUpe1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJldi1lbWl0dGVyL2V2LWVtaXR0ZXJcIixlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKCk6dC5FdkVtaXR0ZXI9ZSgpfShcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93P3dpbmRvdzp0aGlzLGZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCgpe312YXIgZT10LnByb3RvdHlwZTtyZXR1cm4gZS5vbj1mdW5jdGlvbih0LGUpe2lmKHQmJmUpe3ZhciBpPXRoaXMuX2V2ZW50cz10aGlzLl9ldmVudHN8fHt9LG49aVt0XT1pW3RdfHxbXTtyZXR1cm4tMT09bi5pbmRleE9mKGUpJiZuLnB1c2goZSksdGhpc319LGUub25jZT1mdW5jdGlvbih0LGUpe2lmKHQmJmUpe3RoaXMub24odCxlKTt2YXIgaT10aGlzLl9vbmNlRXZlbnRzPXRoaXMuX29uY2VFdmVudHN8fHt9LG49aVt0XT1pW3RdfHx7fTtyZXR1cm4gbltlXT0hMCx0aGlzfX0sZS5vZmY9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50c1t0XTtpZihpJiZpLmxlbmd0aCl7dmFyIG49aS5pbmRleE9mKGUpO3JldHVybi0xIT1uJiZpLnNwbGljZShuLDEpLHRoaXN9fSxlLmVtaXRFdmVudD1mdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMuX2V2ZW50cyYmdGhpcy5fZXZlbnRzW3RdO2lmKGkmJmkubGVuZ3RoKXt2YXIgbj0wLG89aVtuXTtlPWV8fFtdO2Zvcih2YXIgcj10aGlzLl9vbmNlRXZlbnRzJiZ0aGlzLl9vbmNlRXZlbnRzW3RdO287KXt2YXIgcz1yJiZyW29dO3MmJih0aGlzLm9mZih0LG8pLGRlbGV0ZSByW29dKSxvLmFwcGx5KHRoaXMsZSksbis9cz8wOjEsbz1pW25dfXJldHVybiB0aGlzfX0sdH0pLGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImdldC1zaXplL2dldC1zaXplXCIsW10sZnVuY3Rpb24oKXtyZXR1cm4gZSgpfSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZSgpOnQuZ2V0U2l6ZT1lKCl9KHdpbmRvdyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCl7dmFyIGU9cGFyc2VGbG9hdCh0KSxpPS0xPT10LmluZGV4T2YoXCIlXCIpJiYhaXNOYU4oZSk7cmV0dXJuIGkmJmV9ZnVuY3Rpb24gZSgpe31mdW5jdGlvbiBpKCl7Zm9yKHZhciB0PXt3aWR0aDowLGhlaWdodDowLGlubmVyV2lkdGg6MCxpbm5lckhlaWdodDowLG91dGVyV2lkdGg6MCxvdXRlckhlaWdodDowfSxlPTA7dT5lO2UrKyl7dmFyIGk9aFtlXTt0W2ldPTB9cmV0dXJuIHR9ZnVuY3Rpb24gbih0KXt2YXIgZT1nZXRDb21wdXRlZFN0eWxlKHQpO3JldHVybiBlfHxhKFwiU3R5bGUgcmV0dXJuZWQgXCIrZStcIi4gQXJlIHlvdSBydW5uaW5nIHRoaXMgY29kZSBpbiBhIGhpZGRlbiBpZnJhbWUgb24gRmlyZWZveD8gU2VlIGh0dHA6Ly9iaXQubHkvZ2V0c2l6ZWJ1ZzFcIiksZX1mdW5jdGlvbiBvKCl7aWYoIWQpe2Q9ITA7dmFyIGU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtlLnN0eWxlLndpZHRoPVwiMjAwcHhcIixlLnN0eWxlLnBhZGRpbmc9XCIxcHggMnB4IDNweCA0cHhcIixlLnN0eWxlLmJvcmRlclN0eWxlPVwic29saWRcIixlLnN0eWxlLmJvcmRlcldpZHRoPVwiMXB4IDJweCAzcHggNHB4XCIsZS5zdHlsZS5ib3hTaXppbmc9XCJib3JkZXItYm94XCI7dmFyIGk9ZG9jdW1lbnQuYm9keXx8ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O2kuYXBwZW5kQ2hpbGQoZSk7dmFyIG89bihlKTtyLmlzQm94U2l6ZU91dGVyPXM9MjAwPT10KG8ud2lkdGgpLGkucmVtb3ZlQ2hpbGQoZSl9fWZ1bmN0aW9uIHIoZSl7aWYobygpLFwic3RyaW5nXCI9PXR5cGVvZiBlJiYoZT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKGUpKSxlJiZcIm9iamVjdFwiPT10eXBlb2YgZSYmZS5ub2RlVHlwZSl7dmFyIHI9bihlKTtpZihcIm5vbmVcIj09ci5kaXNwbGF5KXJldHVybiBpKCk7dmFyIGE9e307YS53aWR0aD1lLm9mZnNldFdpZHRoLGEuaGVpZ2h0PWUub2Zmc2V0SGVpZ2h0O2Zvcih2YXIgZD1hLmlzQm9yZGVyQm94PVwiYm9yZGVyLWJveFwiPT1yLmJveFNpemluZyxsPTA7dT5sO2wrKyl7dmFyIGM9aFtsXSxmPXJbY10sbT1wYXJzZUZsb2F0KGYpO2FbY109aXNOYU4obSk/MDptfXZhciBwPWEucGFkZGluZ0xlZnQrYS5wYWRkaW5nUmlnaHQsZz1hLnBhZGRpbmdUb3ArYS5wYWRkaW5nQm90dG9tLHk9YS5tYXJnaW5MZWZ0K2EubWFyZ2luUmlnaHQsdj1hLm1hcmdpblRvcCthLm1hcmdpbkJvdHRvbSxfPWEuYm9yZGVyTGVmdFdpZHRoK2EuYm9yZGVyUmlnaHRXaWR0aCx6PWEuYm9yZGVyVG9wV2lkdGgrYS5ib3JkZXJCb3R0b21XaWR0aCxFPWQmJnMsYj10KHIud2lkdGgpO2IhPT0hMSYmKGEud2lkdGg9YisoRT8wOnArXykpO3ZhciB4PXQoci5oZWlnaHQpO3JldHVybiB4IT09ITEmJihhLmhlaWdodD14KyhFPzA6Zyt6KSksYS5pbm5lcldpZHRoPWEud2lkdGgtKHArXyksYS5pbm5lckhlaWdodD1hLmhlaWdodC0oZyt6KSxhLm91dGVyV2lkdGg9YS53aWR0aCt5LGEub3V0ZXJIZWlnaHQ9YS5oZWlnaHQrdixhfX12YXIgcyxhPVwidW5kZWZpbmVkXCI9PXR5cGVvZiBjb25zb2xlP2U6ZnVuY3Rpb24odCl7Y29uc29sZS5lcnJvcih0KX0saD1bXCJwYWRkaW5nTGVmdFwiLFwicGFkZGluZ1JpZ2h0XCIsXCJwYWRkaW5nVG9wXCIsXCJwYWRkaW5nQm90dG9tXCIsXCJtYXJnaW5MZWZ0XCIsXCJtYXJnaW5SaWdodFwiLFwibWFyZ2luVG9wXCIsXCJtYXJnaW5Cb3R0b21cIixcImJvcmRlckxlZnRXaWR0aFwiLFwiYm9yZGVyUmlnaHRXaWR0aFwiLFwiYm9yZGVyVG9wV2lkdGhcIixcImJvcmRlckJvdHRvbVdpZHRoXCJdLHU9aC5sZW5ndGgsZD0hMTtyZXR1cm4gcn0pLGZ1bmN0aW9uKHQsZSl7XCJ1c2Ugc3RyaWN0XCI7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImRlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3IvbWF0Y2hlcy1zZWxlY3RvclwiLGUpOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUoKTp0Lm1hdGNoZXNTZWxlY3Rvcj1lKCl9KHdpbmRvdyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO3ZhciB0PWZ1bmN0aW9uKCl7dmFyIHQ9d2luZG93LkVsZW1lbnQucHJvdG90eXBlO2lmKHQubWF0Y2hlcylyZXR1cm5cIm1hdGNoZXNcIjtpZih0Lm1hdGNoZXNTZWxlY3RvcilyZXR1cm5cIm1hdGNoZXNTZWxlY3RvclwiO2Zvcih2YXIgZT1bXCJ3ZWJraXRcIixcIm1velwiLFwibXNcIixcIm9cIl0saT0wO2k8ZS5sZW5ndGg7aSsrKXt2YXIgbj1lW2ldLG89bitcIk1hdGNoZXNTZWxlY3RvclwiO2lmKHRbb10pcmV0dXJuIG99fSgpO3JldHVybiBmdW5jdGlvbihlLGkpe3JldHVybiBlW3RdKGkpfX0pLGZ1bmN0aW9uKHQsZSl7XCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShcImZpenp5LXVpLXV0aWxzL3V0aWxzXCIsW1wiZGVzYW5kcm8tbWF0Y2hlcy1zZWxlY3Rvci9tYXRjaGVzLXNlbGVjdG9yXCJdLGZ1bmN0aW9uKGkpe3JldHVybiBlKHQsaSl9KTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHQscmVxdWlyZShcImRlc2FuZHJvLW1hdGNoZXMtc2VsZWN0b3JcIikpOnQuZml6enlVSVV0aWxzPWUodCx0Lm1hdGNoZXNTZWxlY3Rvcil9KHdpbmRvdyxmdW5jdGlvbih0LGUpe3ZhciBpPXt9O2kuZXh0ZW5kPWZ1bmN0aW9uKHQsZSl7Zm9yKHZhciBpIGluIGUpdFtpXT1lW2ldO3JldHVybiB0fSxpLm1vZHVsbz1mdW5jdGlvbih0LGUpe3JldHVybih0JWUrZSklZX0saS5tYWtlQXJyYXk9ZnVuY3Rpb24odCl7dmFyIGU9W107aWYoQXJyYXkuaXNBcnJheSh0KSllPXQ7ZWxzZSBpZih0JiZcIm9iamVjdFwiPT10eXBlb2YgdCYmXCJudW1iZXJcIj09dHlwZW9mIHQubGVuZ3RoKWZvcih2YXIgaT0wO2k8dC5sZW5ndGg7aSsrKWUucHVzaCh0W2ldKTtlbHNlIGUucHVzaCh0KTtyZXR1cm4gZX0saS5yZW1vdmVGcm9tPWZ1bmN0aW9uKHQsZSl7dmFyIGk9dC5pbmRleE9mKGUpOy0xIT1pJiZ0LnNwbGljZShpLDEpfSxpLmdldFBhcmVudD1mdW5jdGlvbih0LGkpe2Zvcig7dCE9ZG9jdW1lbnQuYm9keTspaWYodD10LnBhcmVudE5vZGUsZSh0LGkpKXJldHVybiB0fSxpLmdldFF1ZXJ5RWxlbWVudD1mdW5jdGlvbih0KXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgdD9kb2N1bWVudC5xdWVyeVNlbGVjdG9yKHQpOnR9LGkuaGFuZGxlRXZlbnQ9ZnVuY3Rpb24odCl7dmFyIGU9XCJvblwiK3QudHlwZTt0aGlzW2VdJiZ0aGlzW2VdKHQpfSxpLmZpbHRlckZpbmRFbGVtZW50cz1mdW5jdGlvbih0LG4pe3Q9aS5tYWtlQXJyYXkodCk7dmFyIG89W107cmV0dXJuIHQuZm9yRWFjaChmdW5jdGlvbih0KXtpZih0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpe2lmKCFuKXJldHVybiB2b2lkIG8ucHVzaCh0KTtlKHQsbikmJm8ucHVzaCh0KTtmb3IodmFyIGk9dC5xdWVyeVNlbGVjdG9yQWxsKG4pLHI9MDtyPGkubGVuZ3RoO3IrKylvLnB1c2goaVtyXSl9fSksb30saS5kZWJvdW5jZU1ldGhvZD1mdW5jdGlvbih0LGUsaSl7dmFyIG49dC5wcm90b3R5cGVbZV0sbz1lK1wiVGltZW91dFwiO3QucHJvdG90eXBlW2VdPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpc1tvXTt0JiZjbGVhclRpbWVvdXQodCk7dmFyIGU9YXJndW1lbnRzLHI9dGhpczt0aGlzW29dPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtuLmFwcGx5KHIsZSksZGVsZXRlIHJbb119LGl8fDEwMCl9fSxpLmRvY1JlYWR5PWZ1bmN0aW9uKHQpe3ZhciBlPWRvY3VtZW50LnJlYWR5U3RhdGU7XCJjb21wbGV0ZVwiPT1lfHxcImludGVyYWN0aXZlXCI9PWU/c2V0VGltZW91dCh0KTpkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLHQpfSxpLnRvRGFzaGVkPWZ1bmN0aW9uKHQpe3JldHVybiB0LnJlcGxhY2UoLyguKShbQS1aXSkvZyxmdW5jdGlvbih0LGUsaSl7cmV0dXJuIGUrXCItXCIraX0pLnRvTG93ZXJDYXNlKCl9O3ZhciBuPXQuY29uc29sZTtyZXR1cm4gaS5odG1sSW5pdD1mdW5jdGlvbihlLG8pe2kuZG9jUmVhZHkoZnVuY3Rpb24oKXt2YXIgcj1pLnRvRGFzaGVkKG8pLHM9XCJkYXRhLVwiK3IsYT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW1wiK3MrXCJdXCIpLGg9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5qcy1cIityKSx1PWkubWFrZUFycmF5KGEpLmNvbmNhdChpLm1ha2VBcnJheShoKSksZD1zK1wiLW9wdGlvbnNcIixsPXQualF1ZXJ5O3UuZm9yRWFjaChmdW5jdGlvbih0KXt2YXIgaSxyPXQuZ2V0QXR0cmlidXRlKHMpfHx0LmdldEF0dHJpYnV0ZShkKTt0cnl7aT1yJiZKU09OLnBhcnNlKHIpfWNhdGNoKGEpe3JldHVybiB2b2lkKG4mJm4uZXJyb3IoXCJFcnJvciBwYXJzaW5nIFwiK3MrXCIgb24gXCIrdC5jbGFzc05hbWUrXCI6IFwiK2EpKX12YXIgaD1uZXcgZSh0LGkpO2wmJmwuZGF0YSh0LG8saCl9KX0pfSxpfSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwib3V0bGF5ZXIvaXRlbVwiLFtcImV2LWVtaXR0ZXIvZXYtZW1pdHRlclwiLFwiZ2V0LXNpemUvZ2V0LXNpemVcIl0sZSk6XCJvYmplY3RcIj09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ZShyZXF1aXJlKFwiZXYtZW1pdHRlclwiKSxyZXF1aXJlKFwiZ2V0LXNpemVcIikpOih0Lk91dGxheWVyPXt9LHQuT3V0bGF5ZXIuSXRlbT1lKHQuRXZFbWl0dGVyLHQuZ2V0U2l6ZSkpfSh3aW5kb3csZnVuY3Rpb24odCxlKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiBpKHQpe2Zvcih2YXIgZSBpbiB0KXJldHVybiExO3JldHVybiBlPW51bGwsITB9ZnVuY3Rpb24gbih0LGUpe3QmJih0aGlzLmVsZW1lbnQ9dCx0aGlzLmxheW91dD1lLHRoaXMucG9zaXRpb249e3g6MCx5OjB9LHRoaXMuX2NyZWF0ZSgpKX1mdW5jdGlvbiBvKHQpe3JldHVybiB0LnJlcGxhY2UoLyhbQS1aXSkvZyxmdW5jdGlvbih0KXtyZXR1cm5cIi1cIit0LnRvTG93ZXJDYXNlKCl9KX12YXIgcj1kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUscz1cInN0cmluZ1wiPT10eXBlb2Ygci50cmFuc2l0aW9uP1widHJhbnNpdGlvblwiOlwiV2Via2l0VHJhbnNpdGlvblwiLGE9XCJzdHJpbmdcIj09dHlwZW9mIHIudHJhbnNmb3JtP1widHJhbnNmb3JtXCI6XCJXZWJraXRUcmFuc2Zvcm1cIixoPXtXZWJraXRUcmFuc2l0aW9uOlwid2Via2l0VHJhbnNpdGlvbkVuZFwiLHRyYW5zaXRpb246XCJ0cmFuc2l0aW9uZW5kXCJ9W3NdLHU9e3RyYW5zZm9ybTphLHRyYW5zaXRpb246cyx0cmFuc2l0aW9uRHVyYXRpb246cytcIkR1cmF0aW9uXCIsdHJhbnNpdGlvblByb3BlcnR5OnMrXCJQcm9wZXJ0eVwiLHRyYW5zaXRpb25EZWxheTpzK1wiRGVsYXlcIn0sZD1uLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHQucHJvdG90eXBlKTtkLmNvbnN0cnVjdG9yPW4sZC5fY3JlYXRlPWZ1bmN0aW9uKCl7dGhpcy5fdHJhbnNuPXtpbmdQcm9wZXJ0aWVzOnt9LGNsZWFuOnt9LG9uRW5kOnt9fSx0aGlzLmNzcyh7cG9zaXRpb246XCJhYnNvbHV0ZVwifSl9LGQuaGFuZGxlRXZlbnQ9ZnVuY3Rpb24odCl7dmFyIGU9XCJvblwiK3QudHlwZTt0aGlzW2VdJiZ0aGlzW2VdKHQpfSxkLmdldFNpemU9ZnVuY3Rpb24oKXt0aGlzLnNpemU9ZSh0aGlzLmVsZW1lbnQpfSxkLmNzcz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmVsZW1lbnQuc3R5bGU7Zm9yKHZhciBpIGluIHQpe3ZhciBuPXVbaV18fGk7ZVtuXT10W2ldfX0sZC5nZXRQb3NpdGlvbj1mdW5jdGlvbigpe3ZhciB0PWdldENvbXB1dGVkU3R5bGUodGhpcy5lbGVtZW50KSxlPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5MZWZ0XCIpLGk9dGhpcy5sYXlvdXQuX2dldE9wdGlvbihcIm9yaWdpblRvcFwiKSxuPXRbZT9cImxlZnRcIjpcInJpZ2h0XCJdLG89dFtpP1widG9wXCI6XCJib3R0b21cIl0scj10aGlzLmxheW91dC5zaXplLHM9LTEhPW4uaW5kZXhPZihcIiVcIik/cGFyc2VGbG9hdChuKS8xMDAqci53aWR0aDpwYXJzZUludChuLDEwKSxhPS0xIT1vLmluZGV4T2YoXCIlXCIpP3BhcnNlRmxvYXQobykvMTAwKnIuaGVpZ2h0OnBhcnNlSW50KG8sMTApO3M9aXNOYU4ocyk/MDpzLGE9aXNOYU4oYSk/MDphLHMtPWU/ci5wYWRkaW5nTGVmdDpyLnBhZGRpbmdSaWdodCxhLT1pP3IucGFkZGluZ1RvcDpyLnBhZGRpbmdCb3R0b20sdGhpcy5wb3NpdGlvbi54PXMsdGhpcy5wb3NpdGlvbi55PWF9LGQubGF5b3V0UG9zaXRpb249ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmxheW91dC5zaXplLGU9e30saT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxuPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIiksbz1pP1wicGFkZGluZ0xlZnRcIjpcInBhZGRpbmdSaWdodFwiLHI9aT9cImxlZnRcIjpcInJpZ2h0XCIscz1pP1wicmlnaHRcIjpcImxlZnRcIixhPXRoaXMucG9zaXRpb24ueCt0W29dO2Vbcl09dGhpcy5nZXRYVmFsdWUoYSksZVtzXT1cIlwiO3ZhciBoPW4/XCJwYWRkaW5nVG9wXCI6XCJwYWRkaW5nQm90dG9tXCIsdT1uP1widG9wXCI6XCJib3R0b21cIixkPW4/XCJib3R0b21cIjpcInRvcFwiLGw9dGhpcy5wb3NpdGlvbi55K3RbaF07ZVt1XT10aGlzLmdldFlWYWx1ZShsKSxlW2RdPVwiXCIsdGhpcy5jc3MoZSksdGhpcy5lbWl0RXZlbnQoXCJsYXlvdXRcIixbdGhpc10pfSxkLmdldFhWYWx1ZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwiaG9yaXpvbnRhbFwiKTtyZXR1cm4gdGhpcy5sYXlvdXQub3B0aW9ucy5wZXJjZW50UG9zaXRpb24mJiFlP3QvdGhpcy5sYXlvdXQuc2l6ZS53aWR0aCoxMDArXCIlXCI6dCtcInB4XCJ9LGQuZ2V0WVZhbHVlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJob3Jpem9udGFsXCIpO3JldHVybiB0aGlzLmxheW91dC5vcHRpb25zLnBlcmNlbnRQb3NpdGlvbiYmZT90L3RoaXMubGF5b3V0LnNpemUuaGVpZ2h0KjEwMCtcIiVcIjp0K1wicHhcIn0sZC5fdHJhbnNpdGlvblRvPWZ1bmN0aW9uKHQsZSl7dGhpcy5nZXRQb3NpdGlvbigpO3ZhciBpPXRoaXMucG9zaXRpb24ueCxuPXRoaXMucG9zaXRpb24ueSxvPXBhcnNlSW50KHQsMTApLHI9cGFyc2VJbnQoZSwxMCkscz1vPT09dGhpcy5wb3NpdGlvbi54JiZyPT09dGhpcy5wb3NpdGlvbi55O2lmKHRoaXMuc2V0UG9zaXRpb24odCxlKSxzJiYhdGhpcy5pc1RyYW5zaXRpb25pbmcpcmV0dXJuIHZvaWQgdGhpcy5sYXlvdXRQb3NpdGlvbigpO3ZhciBhPXQtaSxoPWUtbix1PXt9O3UudHJhbnNmb3JtPXRoaXMuZ2V0VHJhbnNsYXRlKGEsaCksdGhpcy50cmFuc2l0aW9uKHt0bzp1LG9uVHJhbnNpdGlvbkVuZDp7dHJhbnNmb3JtOnRoaXMubGF5b3V0UG9zaXRpb259LGlzQ2xlYW5pbmc6ITB9KX0sZC5nZXRUcmFuc2xhdGU9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmxheW91dC5fZ2V0T3B0aW9uKFwib3JpZ2luTGVmdFwiKSxuPXRoaXMubGF5b3V0Ll9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIik7cmV0dXJuIHQ9aT90Oi10LGU9bj9lOi1lLFwidHJhbnNsYXRlM2QoXCIrdCtcInB4LCBcIitlK1wicHgsIDApXCJ9LGQuZ29Ubz1mdW5jdGlvbih0LGUpe3RoaXMuc2V0UG9zaXRpb24odCxlKSx0aGlzLmxheW91dFBvc2l0aW9uKCl9LGQubW92ZVRvPWQuX3RyYW5zaXRpb25UbyxkLnNldFBvc2l0aW9uPWZ1bmN0aW9uKHQsZSl7dGhpcy5wb3NpdGlvbi54PXBhcnNlSW50KHQsMTApLHRoaXMucG9zaXRpb24ueT1wYXJzZUludChlLDEwKX0sZC5fbm9uVHJhbnNpdGlvbj1mdW5jdGlvbih0KXt0aGlzLmNzcyh0LnRvKSx0LmlzQ2xlYW5pbmcmJnRoaXMuX3JlbW92ZVN0eWxlcyh0LnRvKTtmb3IodmFyIGUgaW4gdC5vblRyYW5zaXRpb25FbmQpdC5vblRyYW5zaXRpb25FbmRbZV0uY2FsbCh0aGlzKX0sZC50cmFuc2l0aW9uPWZ1bmN0aW9uKHQpe2lmKCFwYXJzZUZsb2F0KHRoaXMubGF5b3V0Lm9wdGlvbnMudHJhbnNpdGlvbkR1cmF0aW9uKSlyZXR1cm4gdm9pZCB0aGlzLl9ub25UcmFuc2l0aW9uKHQpO3ZhciBlPXRoaXMuX3RyYW5zbjtmb3IodmFyIGkgaW4gdC5vblRyYW5zaXRpb25FbmQpZS5vbkVuZFtpXT10Lm9uVHJhbnNpdGlvbkVuZFtpXTtmb3IoaSBpbiB0LnRvKWUuaW5nUHJvcGVydGllc1tpXT0hMCx0LmlzQ2xlYW5pbmcmJihlLmNsZWFuW2ldPSEwKTtpZih0LmZyb20pe3RoaXMuY3NzKHQuZnJvbSk7dmFyIG49dGhpcy5lbGVtZW50Lm9mZnNldEhlaWdodDtuPW51bGx9dGhpcy5lbmFibGVUcmFuc2l0aW9uKHQudG8pLHRoaXMuY3NzKHQudG8pLHRoaXMuaXNUcmFuc2l0aW9uaW5nPSEwfTt2YXIgbD1cIm9wYWNpdHksXCIrbyhhKTtkLmVuYWJsZVRyYW5zaXRpb249ZnVuY3Rpb24oKXtpZighdGhpcy5pc1RyYW5zaXRpb25pbmcpe3ZhciB0PXRoaXMubGF5b3V0Lm9wdGlvbnMudHJhbnNpdGlvbkR1cmF0aW9uO3Q9XCJudW1iZXJcIj09dHlwZW9mIHQ/dCtcIm1zXCI6dCx0aGlzLmNzcyh7dHJhbnNpdGlvblByb3BlcnR5OmwsdHJhbnNpdGlvbkR1cmF0aW9uOnQsdHJhbnNpdGlvbkRlbGF5OnRoaXMuc3RhZ2dlckRlbGF5fHwwfSksdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoaCx0aGlzLCExKX19LGQub253ZWJraXRUcmFuc2l0aW9uRW5kPWZ1bmN0aW9uKHQpe3RoaXMub250cmFuc2l0aW9uZW5kKHQpfSxkLm9ub3RyYW5zaXRpb25lbmQ9ZnVuY3Rpb24odCl7dGhpcy5vbnRyYW5zaXRpb25lbmQodCl9O3ZhciBjPXtcIi13ZWJraXQtdHJhbnNmb3JtXCI6XCJ0cmFuc2Zvcm1cIn07ZC5vbnRyYW5zaXRpb25lbmQ9ZnVuY3Rpb24odCl7aWYodC50YXJnZXQ9PT10aGlzLmVsZW1lbnQpe3ZhciBlPXRoaXMuX3RyYW5zbixuPWNbdC5wcm9wZXJ0eU5hbWVdfHx0LnByb3BlcnR5TmFtZTtpZihkZWxldGUgZS5pbmdQcm9wZXJ0aWVzW25dLGkoZS5pbmdQcm9wZXJ0aWVzKSYmdGhpcy5kaXNhYmxlVHJhbnNpdGlvbigpLG4gaW4gZS5jbGVhbiYmKHRoaXMuZWxlbWVudC5zdHlsZVt0LnByb3BlcnR5TmFtZV09XCJcIixkZWxldGUgZS5jbGVhbltuXSksbiBpbiBlLm9uRW5kKXt2YXIgbz1lLm9uRW5kW25dO28uY2FsbCh0aGlzKSxkZWxldGUgZS5vbkVuZFtuXX10aGlzLmVtaXRFdmVudChcInRyYW5zaXRpb25FbmRcIixbdGhpc10pfX0sZC5kaXNhYmxlVHJhbnNpdGlvbj1mdW5jdGlvbigpe3RoaXMucmVtb3ZlVHJhbnNpdGlvblN0eWxlcygpLHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGgsdGhpcywhMSksdGhpcy5pc1RyYW5zaXRpb25pbmc9ITF9LGQuX3JlbW92ZVN0eWxlcz1mdW5jdGlvbih0KXt2YXIgZT17fTtmb3IodmFyIGkgaW4gdCllW2ldPVwiXCI7dGhpcy5jc3MoZSl9O3ZhciBmPXt0cmFuc2l0aW9uUHJvcGVydHk6XCJcIix0cmFuc2l0aW9uRHVyYXRpb246XCJcIix0cmFuc2l0aW9uRGVsYXk6XCJcIn07cmV0dXJuIGQucmVtb3ZlVHJhbnNpdGlvblN0eWxlcz1mdW5jdGlvbigpe3RoaXMuY3NzKGYpfSxkLnN0YWdnZXI9ZnVuY3Rpb24odCl7dD1pc05hTih0KT8wOnQsdGhpcy5zdGFnZ2VyRGVsYXk9dCtcIm1zXCJ9LGQucmVtb3ZlRWxlbT1mdW5jdGlvbigpe3RoaXMuZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCksdGhpcy5jc3Moe2Rpc3BsYXk6XCJcIn0pLHRoaXMuZW1pdEV2ZW50KFwicmVtb3ZlXCIsW3RoaXNdKX0sZC5yZW1vdmU9ZnVuY3Rpb24oKXtyZXR1cm4gcyYmcGFyc2VGbG9hdCh0aGlzLmxheW91dC5vcHRpb25zLnRyYW5zaXRpb25EdXJhdGlvbik/KHRoaXMub25jZShcInRyYW5zaXRpb25FbmRcIixmdW5jdGlvbigpe3RoaXMucmVtb3ZlRWxlbSgpfSksdm9pZCB0aGlzLmhpZGUoKSk6dm9pZCB0aGlzLnJlbW92ZUVsZW0oKX0sZC5yZXZlYWw9ZnVuY3Rpb24oKXtkZWxldGUgdGhpcy5pc0hpZGRlbix0aGlzLmNzcyh7ZGlzcGxheTpcIlwifSk7dmFyIHQ9dGhpcy5sYXlvdXQub3B0aW9ucyxlPXt9LGk9dGhpcy5nZXRIaWRlUmV2ZWFsVHJhbnNpdGlvbkVuZFByb3BlcnR5KFwidmlzaWJsZVN0eWxlXCIpO2VbaV09dGhpcy5vblJldmVhbFRyYW5zaXRpb25FbmQsdGhpcy50cmFuc2l0aW9uKHtmcm9tOnQuaGlkZGVuU3R5bGUsdG86dC52aXNpYmxlU3R5bGUsaXNDbGVhbmluZzohMCxvblRyYW5zaXRpb25FbmQ6ZX0pfSxkLm9uUmV2ZWFsVHJhbnNpdGlvbkVuZD1mdW5jdGlvbigpe3RoaXMuaXNIaWRkZW58fHRoaXMuZW1pdEV2ZW50KFwicmV2ZWFsXCIpfSxkLmdldEhpZGVSZXZlYWxUcmFuc2l0aW9uRW5kUHJvcGVydHk9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5sYXlvdXQub3B0aW9uc1t0XTtpZihlLm9wYWNpdHkpcmV0dXJuXCJvcGFjaXR5XCI7Zm9yKHZhciBpIGluIGUpcmV0dXJuIGl9LGQuaGlkZT1mdW5jdGlvbigpe3RoaXMuaXNIaWRkZW49ITAsdGhpcy5jc3Moe2Rpc3BsYXk6XCJcIn0pO3ZhciB0PXRoaXMubGF5b3V0Lm9wdGlvbnMsZT17fSxpPXRoaXMuZ2V0SGlkZVJldmVhbFRyYW5zaXRpb25FbmRQcm9wZXJ0eShcImhpZGRlblN0eWxlXCIpO2VbaV09dGhpcy5vbkhpZGVUcmFuc2l0aW9uRW5kLHRoaXMudHJhbnNpdGlvbih7ZnJvbTp0LnZpc2libGVTdHlsZSx0bzp0LmhpZGRlblN0eWxlLGlzQ2xlYW5pbmc6ITAsb25UcmFuc2l0aW9uRW5kOmV9KX0sZC5vbkhpZGVUcmFuc2l0aW9uRW5kPWZ1bmN0aW9uKCl7dGhpcy5pc0hpZGRlbiYmKHRoaXMuY3NzKHtkaXNwbGF5Olwibm9uZVwifSksdGhpcy5lbWl0RXZlbnQoXCJoaWRlXCIpKX0sZC5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy5jc3Moe3Bvc2l0aW9uOlwiXCIsbGVmdDpcIlwiLHJpZ2h0OlwiXCIsdG9wOlwiXCIsYm90dG9tOlwiXCIsdHJhbnNpdGlvbjpcIlwiLHRyYW5zZm9ybTpcIlwifSl9LG59KSxmdW5jdGlvbih0LGUpe1widXNlIHN0cmljdFwiO1wiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoXCJvdXRsYXllci9vdXRsYXllclwiLFtcImV2LWVtaXR0ZXIvZXYtZW1pdHRlclwiLFwiZ2V0LXNpemUvZ2V0LXNpemVcIixcImZpenp5LXVpLXV0aWxzL3V0aWxzXCIsXCIuL2l0ZW1cIl0sZnVuY3Rpb24oaSxuLG8scil7cmV0dXJuIGUodCxpLG4sbyxyKX0pOlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPWUodCxyZXF1aXJlKFwiZXYtZW1pdHRlclwiKSxyZXF1aXJlKFwiZ2V0LXNpemVcIikscmVxdWlyZShcImZpenp5LXVpLXV0aWxzXCIpLHJlcXVpcmUoXCIuL2l0ZW1cIikpOnQuT3V0bGF5ZXI9ZSh0LHQuRXZFbWl0dGVyLHQuZ2V0U2l6ZSx0LmZpenp5VUlVdGlscyx0Lk91dGxheWVyLkl0ZW0pfSh3aW5kb3csZnVuY3Rpb24odCxlLGksbixvKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiByKHQsZSl7dmFyIGk9bi5nZXRRdWVyeUVsZW1lbnQodCk7aWYoIWkpcmV0dXJuIHZvaWQoaCYmaC5lcnJvcihcIkJhZCBlbGVtZW50IGZvciBcIit0aGlzLmNvbnN0cnVjdG9yLm5hbWVzcGFjZStcIjogXCIrKGl8fHQpKSk7dGhpcy5lbGVtZW50PWksdSYmKHRoaXMuJGVsZW1lbnQ9dSh0aGlzLmVsZW1lbnQpKSx0aGlzLm9wdGlvbnM9bi5leHRlbmQoe30sdGhpcy5jb25zdHJ1Y3Rvci5kZWZhdWx0cyksdGhpcy5vcHRpb24oZSk7dmFyIG89KytsO3RoaXMuZWxlbWVudC5vdXRsYXllckdVSUQ9byxjW29dPXRoaXMsdGhpcy5fY3JlYXRlKCk7dmFyIHI9dGhpcy5fZ2V0T3B0aW9uKFwiaW5pdExheW91dFwiKTtyJiZ0aGlzLmxheW91dCgpfWZ1bmN0aW9uIHModCl7ZnVuY3Rpb24gZSgpe3QuYXBwbHkodGhpcyxhcmd1bWVudHMpfXJldHVybiBlLnByb3RvdHlwZT1PYmplY3QuY3JlYXRlKHQucHJvdG90eXBlKSxlLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcj1lLGV9ZnVuY3Rpb24gYSh0KXtpZihcIm51bWJlclwiPT10eXBlb2YgdClyZXR1cm4gdDt2YXIgZT10Lm1hdGNoKC8oXlxcZCpcXC4/XFxkKikoXFx3KikvKSxpPWUmJmVbMV0sbj1lJiZlWzJdO2lmKCFpLmxlbmd0aClyZXR1cm4gMDtpPXBhcnNlRmxvYXQoaSk7dmFyIG89bVtuXXx8MTtyZXR1cm4gaSpvfXZhciBoPXQuY29uc29sZSx1PXQualF1ZXJ5LGQ9ZnVuY3Rpb24oKXt9LGw9MCxjPXt9O3IubmFtZXNwYWNlPVwib3V0bGF5ZXJcIixyLkl0ZW09byxyLmRlZmF1bHRzPXtjb250YWluZXJTdHlsZTp7cG9zaXRpb246XCJyZWxhdGl2ZVwifSxpbml0TGF5b3V0OiEwLG9yaWdpbkxlZnQ6ITAsb3JpZ2luVG9wOiEwLHJlc2l6ZTohMCxyZXNpemVDb250YWluZXI6ITAsdHJhbnNpdGlvbkR1cmF0aW9uOlwiMC40c1wiLGhpZGRlblN0eWxlOntvcGFjaXR5OjAsdHJhbnNmb3JtOlwic2NhbGUoMC4wMDEpXCJ9LHZpc2libGVTdHlsZTp7b3BhY2l0eToxLHRyYW5zZm9ybTpcInNjYWxlKDEpXCJ9fTt2YXIgZj1yLnByb3RvdHlwZTtuLmV4dGVuZChmLGUucHJvdG90eXBlKSxmLm9wdGlvbj1mdW5jdGlvbih0KXtuLmV4dGVuZCh0aGlzLm9wdGlvbnMsdCl9LGYuX2dldE9wdGlvbj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmNvbnN0cnVjdG9yLmNvbXBhdE9wdGlvbnNbdF07cmV0dXJuIGUmJnZvaWQgMCE9PXRoaXMub3B0aW9uc1tlXT90aGlzLm9wdGlvbnNbZV06dGhpcy5vcHRpb25zW3RdfSxyLmNvbXBhdE9wdGlvbnM9e2luaXRMYXlvdXQ6XCJpc0luaXRMYXlvdXRcIixob3Jpem9udGFsOlwiaXNIb3Jpem9udGFsXCIsbGF5b3V0SW5zdGFudDpcImlzTGF5b3V0SW5zdGFudFwiLG9yaWdpbkxlZnQ6XCJpc09yaWdpbkxlZnRcIixvcmlnaW5Ub3A6XCJpc09yaWdpblRvcFwiLHJlc2l6ZTpcImlzUmVzaXplQm91bmRcIixyZXNpemVDb250YWluZXI6XCJpc1Jlc2l6aW5nQ29udGFpbmVyXCJ9LGYuX2NyZWF0ZT1mdW5jdGlvbigpe3RoaXMucmVsb2FkSXRlbXMoKSx0aGlzLnN0YW1wcz1bXSx0aGlzLnN0YW1wKHRoaXMub3B0aW9ucy5zdGFtcCksbi5leHRlbmQodGhpcy5lbGVtZW50LnN0eWxlLHRoaXMub3B0aW9ucy5jb250YWluZXJTdHlsZSk7dmFyIHQ9dGhpcy5fZ2V0T3B0aW9uKFwicmVzaXplXCIpO3QmJnRoaXMuYmluZFJlc2l6ZSgpfSxmLnJlbG9hZEl0ZW1zPWZ1bmN0aW9uKCl7dGhpcy5pdGVtcz10aGlzLl9pdGVtaXplKHRoaXMuZWxlbWVudC5jaGlsZHJlbil9LGYuX2l0ZW1pemU9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPXRoaXMuX2ZpbHRlckZpbmRJdGVtRWxlbWVudHModCksaT10aGlzLmNvbnN0cnVjdG9yLkl0ZW0sbj1bXSxvPTA7bzxlLmxlbmd0aDtvKyspe3ZhciByPWVbb10scz1uZXcgaShyLHRoaXMpO24ucHVzaChzKX1yZXR1cm4gbn0sZi5fZmlsdGVyRmluZEl0ZW1FbGVtZW50cz1mdW5jdGlvbih0KXtyZXR1cm4gbi5maWx0ZXJGaW5kRWxlbWVudHModCx0aGlzLm9wdGlvbnMuaXRlbVNlbGVjdG9yKX0sZi5nZXRJdGVtRWxlbWVudHM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pdGVtcy5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIHQuZWxlbWVudH0pfSxmLmxheW91dD1mdW5jdGlvbigpe3RoaXMuX3Jlc2V0TGF5b3V0KCksdGhpcy5fbWFuYWdlU3RhbXBzKCk7dmFyIHQ9dGhpcy5fZ2V0T3B0aW9uKFwibGF5b3V0SW5zdGFudFwiKSxlPXZvaWQgMCE9PXQ/dDohdGhpcy5faXNMYXlvdXRJbml0ZWQ7dGhpcy5sYXlvdXRJdGVtcyh0aGlzLml0ZW1zLGUpLHRoaXMuX2lzTGF5b3V0SW5pdGVkPSEwfSxmLl9pbml0PWYubGF5b3V0LGYuX3Jlc2V0TGF5b3V0PWZ1bmN0aW9uKCl7dGhpcy5nZXRTaXplKCl9LGYuZ2V0U2l6ZT1mdW5jdGlvbigpe3RoaXMuc2l6ZT1pKHRoaXMuZWxlbWVudCl9LGYuX2dldE1lYXN1cmVtZW50PWZ1bmN0aW9uKHQsZSl7dmFyIG4sbz10aGlzLm9wdGlvbnNbdF07bz8oXCJzdHJpbmdcIj09dHlwZW9mIG8/bj10aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcihvKTpvIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQmJihuPW8pLHRoaXNbdF09bj9pKG4pW2VdOm8pOnRoaXNbdF09MH0sZi5sYXlvdXRJdGVtcz1mdW5jdGlvbih0LGUpe3Q9dGhpcy5fZ2V0SXRlbXNGb3JMYXlvdXQodCksdGhpcy5fbGF5b3V0SXRlbXModCxlKSx0aGlzLl9wb3N0TGF5b3V0KCl9LGYuX2dldEl0ZW1zRm9yTGF5b3V0PWZ1bmN0aW9uKHQpe3JldHVybiB0LmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm4hdC5pc0lnbm9yZWR9KX0sZi5fbGF5b3V0SXRlbXM9ZnVuY3Rpb24odCxlKXtpZih0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwibGF5b3V0XCIsdCksdCYmdC5sZW5ndGgpe3ZhciBpPVtdO3QuZm9yRWFjaChmdW5jdGlvbih0KXt2YXIgbj10aGlzLl9nZXRJdGVtTGF5b3V0UG9zaXRpb24odCk7bi5pdGVtPXQsbi5pc0luc3RhbnQ9ZXx8dC5pc0xheW91dEluc3RhbnQsaS5wdXNoKG4pfSx0aGlzKSx0aGlzLl9wcm9jZXNzTGF5b3V0UXVldWUoaSl9fSxmLl9nZXRJdGVtTGF5b3V0UG9zaXRpb249ZnVuY3Rpb24oKXtyZXR1cm57eDowLHk6MH19LGYuX3Byb2Nlc3NMYXlvdXRRdWV1ZT1mdW5jdGlvbih0KXt0aGlzLnVwZGF0ZVN0YWdnZXIoKSx0LmZvckVhY2goZnVuY3Rpb24odCxlKXt0aGlzLl9wb3NpdGlvbkl0ZW0odC5pdGVtLHQueCx0LnksdC5pc0luc3RhbnQsZSl9LHRoaXMpfSxmLnVwZGF0ZVN0YWdnZXI9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLm9wdGlvbnMuc3RhZ2dlcjtyZXR1cm4gbnVsbD09PXR8fHZvaWQgMD09PXQ/dm9pZCh0aGlzLnN0YWdnZXI9MCk6KHRoaXMuc3RhZ2dlcj1hKHQpLHRoaXMuc3RhZ2dlcil9LGYuX3Bvc2l0aW9uSXRlbT1mdW5jdGlvbih0LGUsaSxuLG8pe24/dC5nb1RvKGUsaSk6KHQuc3RhZ2dlcihvKnRoaXMuc3RhZ2dlciksdC5tb3ZlVG8oZSxpKSl9LGYuX3Bvc3RMYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLnJlc2l6ZUNvbnRhaW5lcigpfSxmLnJlc2l6ZUNvbnRhaW5lcj1mdW5jdGlvbigpe3ZhciB0PXRoaXMuX2dldE9wdGlvbihcInJlc2l6ZUNvbnRhaW5lclwiKTtpZih0KXt2YXIgZT10aGlzLl9nZXRDb250YWluZXJTaXplKCk7ZSYmKHRoaXMuX3NldENvbnRhaW5lck1lYXN1cmUoZS53aWR0aCwhMCksdGhpcy5fc2V0Q29udGFpbmVyTWVhc3VyZShlLmhlaWdodCwhMSkpfX0sZi5fZ2V0Q29udGFpbmVyU2l6ZT1kLGYuX3NldENvbnRhaW5lck1lYXN1cmU9ZnVuY3Rpb24odCxlKXtpZih2b2lkIDAhPT10KXt2YXIgaT10aGlzLnNpemU7aS5pc0JvcmRlckJveCYmKHQrPWU/aS5wYWRkaW5nTGVmdCtpLnBhZGRpbmdSaWdodCtpLmJvcmRlckxlZnRXaWR0aCtpLmJvcmRlclJpZ2h0V2lkdGg6aS5wYWRkaW5nQm90dG9tK2kucGFkZGluZ1RvcCtpLmJvcmRlclRvcFdpZHRoK2kuYm9yZGVyQm90dG9tV2lkdGgpLHQ9TWF0aC5tYXgodCwwKSx0aGlzLmVsZW1lbnQuc3R5bGVbZT9cIndpZHRoXCI6XCJoZWlnaHRcIl09dCtcInB4XCJ9fSxmLl9lbWl0Q29tcGxldGVPbkl0ZW1zPWZ1bmN0aW9uKHQsZSl7ZnVuY3Rpb24gaSgpe28uZGlzcGF0Y2hFdmVudCh0K1wiQ29tcGxldGVcIixudWxsLFtlXSl9ZnVuY3Rpb24gbigpe3MrKyxzPT1yJiZpKCl9dmFyIG89dGhpcyxyPWUubGVuZ3RoO2lmKCFlfHwhcilyZXR1cm4gdm9pZCBpKCk7dmFyIHM9MDtlLmZvckVhY2goZnVuY3Rpb24oZSl7ZS5vbmNlKHQsbil9KX0sZi5kaXNwYXRjaEV2ZW50PWZ1bmN0aW9uKHQsZSxpKXt2YXIgbj1lP1tlXS5jb25jYXQoaSk6aTtpZih0aGlzLmVtaXRFdmVudCh0LG4pLHUpaWYodGhpcy4kZWxlbWVudD10aGlzLiRlbGVtZW50fHx1KHRoaXMuZWxlbWVudCksZSl7dmFyIG89dS5FdmVudChlKTtvLnR5cGU9dCx0aGlzLiRlbGVtZW50LnRyaWdnZXIobyxpKX1lbHNlIHRoaXMuJGVsZW1lbnQudHJpZ2dlcih0LGkpfSxmLmlnbm9yZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW0odCk7ZSYmKGUuaXNJZ25vcmVkPSEwKX0sZi51bmlnbm9yZT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldEl0ZW0odCk7ZSYmZGVsZXRlIGUuaXNJZ25vcmVkfSxmLnN0YW1wPWZ1bmN0aW9uKHQpe3Q9dGhpcy5fZmluZCh0KSx0JiYodGhpcy5zdGFtcHM9dGhpcy5zdGFtcHMuY29uY2F0KHQpLHQuZm9yRWFjaCh0aGlzLmlnbm9yZSx0aGlzKSl9LGYudW5zdGFtcD1mdW5jdGlvbih0KXt0PXRoaXMuX2ZpbmQodCksdCYmdC5mb3JFYWNoKGZ1bmN0aW9uKHQpe24ucmVtb3ZlRnJvbSh0aGlzLnN0YW1wcyx0KSx0aGlzLnVuaWdub3JlKHQpfSx0aGlzKX0sZi5fZmluZD1mdW5jdGlvbih0KXtyZXR1cm4gdD8oXCJzdHJpbmdcIj09dHlwZW9mIHQmJih0PXRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKHQpKSx0PW4ubWFrZUFycmF5KHQpKTp2b2lkIDB9LGYuX21hbmFnZVN0YW1wcz1mdW5jdGlvbigpe3RoaXMuc3RhbXBzJiZ0aGlzLnN0YW1wcy5sZW5ndGgmJih0aGlzLl9nZXRCb3VuZGluZ1JlY3QoKSx0aGlzLnN0YW1wcy5mb3JFYWNoKHRoaXMuX21hbmFnZVN0YW1wLHRoaXMpKX0sZi5fZ2V0Qm91bmRpbmdSZWN0PWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLGU9dGhpcy5zaXplO3RoaXMuX2JvdW5kaW5nUmVjdD17bGVmdDp0LmxlZnQrZS5wYWRkaW5nTGVmdCtlLmJvcmRlckxlZnRXaWR0aCx0b3A6dC50b3ArZS5wYWRkaW5nVG9wK2UuYm9yZGVyVG9wV2lkdGgscmlnaHQ6dC5yaWdodC0oZS5wYWRkaW5nUmlnaHQrZS5ib3JkZXJSaWdodFdpZHRoKSxib3R0b206dC5ib3R0b20tKGUucGFkZGluZ0JvdHRvbStlLmJvcmRlckJvdHRvbVdpZHRoKX19LGYuX21hbmFnZVN0YW1wPWQsZi5fZ2V0RWxlbWVudE9mZnNldD1mdW5jdGlvbih0KXt2YXIgZT10LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLG49dGhpcy5fYm91bmRpbmdSZWN0LG89aSh0KSxyPXtsZWZ0OmUubGVmdC1uLmxlZnQtby5tYXJnaW5MZWZ0LHRvcDplLnRvcC1uLnRvcC1vLm1hcmdpblRvcCxyaWdodDpuLnJpZ2h0LWUucmlnaHQtby5tYXJnaW5SaWdodCxib3R0b206bi5ib3R0b20tZS5ib3R0b20tby5tYXJnaW5Cb3R0b219O3JldHVybiByfSxmLmhhbmRsZUV2ZW50PW4uaGFuZGxlRXZlbnQsZi5iaW5kUmVzaXplPWZ1bmN0aW9uKCl7dC5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsdGhpcyksdGhpcy5pc1Jlc2l6ZUJvdW5kPSEwfSxmLnVuYmluZFJlc2l6ZT1mdW5jdGlvbigpe3QucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLHRoaXMpLHRoaXMuaXNSZXNpemVCb3VuZD0hMX0sZi5vbnJlc2l6ZT1mdW5jdGlvbigpe3RoaXMucmVzaXplKCl9LG4uZGVib3VuY2VNZXRob2QocixcIm9ucmVzaXplXCIsMTAwKSxmLnJlc2l6ZT1mdW5jdGlvbigpe3RoaXMuaXNSZXNpemVCb3VuZCYmdGhpcy5uZWVkc1Jlc2l6ZUxheW91dCgpJiZ0aGlzLmxheW91dCgpfSxmLm5lZWRzUmVzaXplTGF5b3V0PWZ1bmN0aW9uKCl7dmFyIHQ9aSh0aGlzLmVsZW1lbnQpLGU9dGhpcy5zaXplJiZ0O3JldHVybiBlJiZ0LmlubmVyV2lkdGghPT10aGlzLnNpemUuaW5uZXJXaWR0aH0sZi5hZGRJdGVtcz1mdW5jdGlvbih0KXt2YXIgZT10aGlzLl9pdGVtaXplKHQpO3JldHVybiBlLmxlbmd0aCYmKHRoaXMuaXRlbXM9dGhpcy5pdGVtcy5jb25jYXQoZSkpLGV9LGYuYXBwZW5kZWQ9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5hZGRJdGVtcyh0KTtlLmxlbmd0aCYmKHRoaXMubGF5b3V0SXRlbXMoZSwhMCksdGhpcy5yZXZlYWwoZSkpfSxmLnByZXBlbmRlZD1mdW5jdGlvbih0KXt2YXIgZT10aGlzLl9pdGVtaXplKHQpO2lmKGUubGVuZ3RoKXt2YXIgaT10aGlzLml0ZW1zLnNsaWNlKDApO3RoaXMuaXRlbXM9ZS5jb25jYXQoaSksdGhpcy5fcmVzZXRMYXlvdXQoKSx0aGlzLl9tYW5hZ2VTdGFtcHMoKSx0aGlzLmxheW91dEl0ZW1zKGUsITApLHRoaXMucmV2ZWFsKGUpLHRoaXMubGF5b3V0SXRlbXMoaSl9fSxmLnJldmVhbD1mdW5jdGlvbih0KXtpZih0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwicmV2ZWFsXCIsdCksdCYmdC5sZW5ndGgpe3ZhciBlPXRoaXMudXBkYXRlU3RhZ2dlcigpO3QuZm9yRWFjaChmdW5jdGlvbih0LGkpe3Quc3RhZ2dlcihpKmUpLHQucmV2ZWFsKCl9KX19LGYuaGlkZT1mdW5jdGlvbih0KXtpZih0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwiaGlkZVwiLHQpLHQmJnQubGVuZ3RoKXt2YXIgZT10aGlzLnVwZGF0ZVN0YWdnZXIoKTt0LmZvckVhY2goZnVuY3Rpb24odCxpKXt0LnN0YWdnZXIoaSplKSx0LmhpZGUoKX0pfX0sZi5yZXZlYWxJdGVtRWxlbWVudHM9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtcyh0KTt0aGlzLnJldmVhbChlKX0sZi5oaWRlSXRlbUVsZW1lbnRzPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0SXRlbXModCk7dGhpcy5oaWRlKGUpfSxmLmdldEl0ZW09ZnVuY3Rpb24odCl7Zm9yKHZhciBlPTA7ZTx0aGlzLml0ZW1zLmxlbmd0aDtlKyspe3ZhciBpPXRoaXMuaXRlbXNbZV07aWYoaS5lbGVtZW50PT10KXJldHVybiBpfX0sZi5nZXRJdGVtcz1mdW5jdGlvbih0KXt0PW4ubWFrZUFycmF5KHQpO3ZhciBlPVtdO3JldHVybiB0LmZvckVhY2goZnVuY3Rpb24odCl7dmFyIGk9dGhpcy5nZXRJdGVtKHQpO2kmJmUucHVzaChpKX0sdGhpcyksZX0sZi5yZW1vdmU9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRJdGVtcyh0KTt0aGlzLl9lbWl0Q29tcGxldGVPbkl0ZW1zKFwicmVtb3ZlXCIsZSksZSYmZS5sZW5ndGgmJmUuZm9yRWFjaChmdW5jdGlvbih0KXt0LnJlbW92ZSgpLG4ucmVtb3ZlRnJvbSh0aGlzLml0ZW1zLHQpfSx0aGlzKX0sZi5kZXN0cm95PWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5lbGVtZW50LnN0eWxlO3QuaGVpZ2h0PVwiXCIsdC5wb3NpdGlvbj1cIlwiLHQud2lkdGg9XCJcIix0aGlzLml0ZW1zLmZvckVhY2goZnVuY3Rpb24odCl7dC5kZXN0cm95KCl9KSx0aGlzLnVuYmluZFJlc2l6ZSgpO3ZhciBlPXRoaXMuZWxlbWVudC5vdXRsYXllckdVSUQ7ZGVsZXRlIGNbZV0sZGVsZXRlIHRoaXMuZWxlbWVudC5vdXRsYXllckdVSUQsdSYmdS5yZW1vdmVEYXRhKHRoaXMuZWxlbWVudCx0aGlzLmNvbnN0cnVjdG9yLm5hbWVzcGFjZSl9LHIuZGF0YT1mdW5jdGlvbih0KXt0PW4uZ2V0UXVlcnlFbGVtZW50KHQpO3ZhciBlPXQmJnQub3V0bGF5ZXJHVUlEO3JldHVybiBlJiZjW2VdfSxyLmNyZWF0ZT1mdW5jdGlvbih0LGUpe3ZhciBpPXMocik7cmV0dXJuIGkuZGVmYXVsdHM9bi5leHRlbmQoe30sci5kZWZhdWx0cyksbi5leHRlbmQoaS5kZWZhdWx0cyxlKSxpLmNvbXBhdE9wdGlvbnM9bi5leHRlbmQoe30sci5jb21wYXRPcHRpb25zKSxpLm5hbWVzcGFjZT10LGkuZGF0YT1yLmRhdGEsaS5JdGVtPXMobyksbi5odG1sSW5pdChpLHQpLHUmJnUuYnJpZGdldCYmdS5icmlkZ2V0KHQsaSksaX07dmFyIG09e21zOjEsczoxZTN9O3JldHVybiByLkl0ZW09byxyfSksZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFtcIm91dGxheWVyL291dGxheWVyXCIsXCJnZXQtc2l6ZS9nZXQtc2l6ZVwiXSxlKTpcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1lKHJlcXVpcmUoXCJvdXRsYXllclwiKSxyZXF1aXJlKFwiZ2V0LXNpemVcIikpOnQuTWFzb25yeT1lKHQuT3V0bGF5ZXIsdC5nZXRTaXplKX0od2luZG93LGZ1bmN0aW9uKHQsZSl7dmFyIGk9dC5jcmVhdGUoXCJtYXNvbnJ5XCIpO2kuY29tcGF0T3B0aW9ucy5maXRXaWR0aD1cImlzRml0V2lkdGhcIjt2YXIgbj1pLnByb3RvdHlwZTtyZXR1cm4gbi5fcmVzZXRMYXlvdXQ9ZnVuY3Rpb24oKXt0aGlzLmdldFNpemUoKSx0aGlzLl9nZXRNZWFzdXJlbWVudChcImNvbHVtbldpZHRoXCIsXCJvdXRlcldpZHRoXCIpLHRoaXMuX2dldE1lYXN1cmVtZW50KFwiZ3V0dGVyXCIsXCJvdXRlcldpZHRoXCIpLHRoaXMubWVhc3VyZUNvbHVtbnMoKSx0aGlzLmNvbFlzPVtdO2Zvcih2YXIgdD0wO3Q8dGhpcy5jb2xzO3QrKyl0aGlzLmNvbFlzLnB1c2goMCk7dGhpcy5tYXhZPTAsdGhpcy5ob3Jpem9udGFsQ29sSW5kZXg9MH0sbi5tZWFzdXJlQ29sdW1ucz1mdW5jdGlvbigpe2lmKHRoaXMuZ2V0Q29udGFpbmVyV2lkdGgoKSwhdGhpcy5jb2x1bW5XaWR0aCl7dmFyIHQ9dGhpcy5pdGVtc1swXSxpPXQmJnQuZWxlbWVudDt0aGlzLmNvbHVtbldpZHRoPWkmJmUoaSkub3V0ZXJXaWR0aHx8dGhpcy5jb250YWluZXJXaWR0aH12YXIgbj10aGlzLmNvbHVtbldpZHRoKz10aGlzLmd1dHRlcixvPXRoaXMuY29udGFpbmVyV2lkdGgrdGhpcy5ndXR0ZXIscj1vL24scz1uLW8lbixhPXMmJjE+cz9cInJvdW5kXCI6XCJmbG9vclwiO3I9TWF0aFthXShyKSx0aGlzLmNvbHM9TWF0aC5tYXgociwxKX0sbi5nZXRDb250YWluZXJXaWR0aD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuX2dldE9wdGlvbihcImZpdFdpZHRoXCIpLGk9dD90aGlzLmVsZW1lbnQucGFyZW50Tm9kZTp0aGlzLmVsZW1lbnQsbj1lKGkpO3RoaXMuY29udGFpbmVyV2lkdGg9biYmbi5pbm5lcldpZHRofSxuLl9nZXRJdGVtTGF5b3V0UG9zaXRpb249ZnVuY3Rpb24odCl7dC5nZXRTaXplKCk7dmFyIGU9dC5zaXplLm91dGVyV2lkdGgldGhpcy5jb2x1bW5XaWR0aCxpPWUmJjE+ZT9cInJvdW5kXCI6XCJjZWlsXCIsbj1NYXRoW2ldKHQuc2l6ZS5vdXRlcldpZHRoL3RoaXMuY29sdW1uV2lkdGgpO249TWF0aC5taW4obix0aGlzLmNvbHMpO2Zvcih2YXIgbz10aGlzLm9wdGlvbnMuaG9yaXpvbnRhbE9yZGVyP1wiX2dldEhvcml6b250YWxDb2xQb3NpdGlvblwiOlwiX2dldFRvcENvbFBvc2l0aW9uXCIscj10aGlzW29dKG4sdCkscz17eDp0aGlzLmNvbHVtbldpZHRoKnIuY29sLHk6ci55fSxhPXIueSt0LnNpemUub3V0ZXJIZWlnaHQsaD1uK3IuY29sLHU9ci5jb2w7aD51O3UrKyl0aGlzLmNvbFlzW3VdPWE7cmV0dXJuIHN9LG4uX2dldFRvcENvbFBvc2l0aW9uPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX2dldFRvcENvbEdyb3VwKHQpLGk9TWF0aC5taW4uYXBwbHkoTWF0aCxlKTtyZXR1cm57Y29sOmUuaW5kZXhPZihpKSx5Oml9fSxuLl9nZXRUb3BDb2xHcm91cD1mdW5jdGlvbih0KXtpZigyPnQpcmV0dXJuIHRoaXMuY29sWXM7Zm9yKHZhciBlPVtdLGk9dGhpcy5jb2xzKzEtdCxuPTA7aT5uO24rKyllW25dPXRoaXMuX2dldENvbEdyb3VwWShuLHQpO3JldHVybiBlfSxuLl9nZXRDb2xHcm91cFk9ZnVuY3Rpb24odCxlKXtpZigyPmUpcmV0dXJuIHRoaXMuY29sWXNbdF07dmFyIGk9dGhpcy5jb2xZcy5zbGljZSh0LHQrZSk7cmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsaSl9LG4uX2dldEhvcml6b250YWxDb2xQb3NpdGlvbj1mdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMuaG9yaXpvbnRhbENvbEluZGV4JXRoaXMuY29scyxuPXQ+MSYmaSt0PnRoaXMuY29scztpPW4/MDppO3ZhciBvPWUuc2l6ZS5vdXRlcldpZHRoJiZlLnNpemUub3V0ZXJIZWlnaHQ7cmV0dXJuIHRoaXMuaG9yaXpvbnRhbENvbEluZGV4PW8/aSt0OnRoaXMuaG9yaXpvbnRhbENvbEluZGV4LHtjb2w6aSx5OnRoaXMuX2dldENvbEdyb3VwWShpLHQpfX0sbi5fbWFuYWdlU3RhbXA9ZnVuY3Rpb24odCl7dmFyIGk9ZSh0KSxuPXRoaXMuX2dldEVsZW1lbnRPZmZzZXQodCksbz10aGlzLl9nZXRPcHRpb24oXCJvcmlnaW5MZWZ0XCIpLHI9bz9uLmxlZnQ6bi5yaWdodCxzPXIraS5vdXRlcldpZHRoLGE9TWF0aC5mbG9vcihyL3RoaXMuY29sdW1uV2lkdGgpO2E9TWF0aC5tYXgoMCxhKTt2YXIgaD1NYXRoLmZsb29yKHMvdGhpcy5jb2x1bW5XaWR0aCk7aC09cyV0aGlzLmNvbHVtbldpZHRoPzA6MSxoPU1hdGgubWluKHRoaXMuY29scy0xLGgpO2Zvcih2YXIgdT10aGlzLl9nZXRPcHRpb24oXCJvcmlnaW5Ub3BcIiksZD0odT9uLnRvcDpuLmJvdHRvbSkraS5vdXRlckhlaWdodCxsPWE7aD49bDtsKyspdGhpcy5jb2xZc1tsXT1NYXRoLm1heChkLHRoaXMuY29sWXNbbF0pfSxuLl9nZXRDb250YWluZXJTaXplPWZ1bmN0aW9uKCl7dGhpcy5tYXhZPU1hdGgubWF4LmFwcGx5KE1hdGgsdGhpcy5jb2xZcyk7dmFyIHQ9e2hlaWdodDp0aGlzLm1heFl9O3JldHVybiB0aGlzLl9nZXRPcHRpb24oXCJmaXRXaWR0aFwiKSYmKHQud2lkdGg9dGhpcy5fZ2V0Q29udGFpbmVyRml0V2lkdGgoKSksdH0sbi5fZ2V0Q29udGFpbmVyRml0V2lkdGg9ZnVuY3Rpb24oKXtmb3IodmFyIHQ9MCxlPXRoaXMuY29sczstLWUmJjA9PT10aGlzLmNvbFlzW2VdOyl0Kys7cmV0dXJuKHRoaXMuY29scy10KSp0aGlzLmNvbHVtbldpZHRoLXRoaXMuZ3V0dGVyfSxuLm5lZWRzUmVzaXplTGF5b3V0PWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5jb250YWluZXJXaWR0aDtyZXR1cm4gdGhpcy5nZXRDb250YWluZXJXaWR0aCgpLHQhPXRoaXMuY29udGFpbmVyV2lkdGh9LGl9KTsiLCJcclxuZnVuY3Rpb24gc3RhckZ1bmN0aW9uKHgsIHkpIHtcclxuXHJcbiAgICBhcGlfdXJsID0gJy9hcGkvdjEvc3Rhci8nICsgeSArICcvJztcclxuXHJcbiAgICBpZih4LmNsYXNzTGlzdC5jb250YWlucyhcImZhLXN0YXItb1wiKSl7XHJcbiAgICAgICAgIGlmKHguY2xhc3NMaXN0LmNvbnRhaW5zKFwibm90LWxvZ2dlZC1pblwiKSl7XHJcbi8vICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuY3NzKHtcInZpc2liaWxpdHlcIjpcInZpc2libGVcIixcImRpc3BsYXlcIjpcImJsb2NrXCJ9KTtcclxuICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmNzcyh7XCJkaXNwbGF5XCI6XCJub25lXCJ9KTtcclxuICAgICAgICAgICAgJChcIiNsb2dpbmZvcm1cIikuZmFkZUluKCk7XHJcbi8vICAgICAgICAgICAgJChcIiNyZXN0YXVyYW50XCIpLmZhZGVPdXQoKTtcclxuICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIHguY2xhc3NMaXN0LnJlbW92ZShcImZhLXN0YXItb1wiKVxyXG4gICAgICAgICAgICB4LmNsYXNzTGlzdC5hZGQoXCJmYS1zdGFyXCIpXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYXBpX3VybCwgICAgLy9Zb3VyIGFwaSB1cmxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BVVCcsICAgLy90eXBlIGlzIGFueSBIVFRQIG1ldGhvZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAgICAgIC8vRGF0YSBhcyBqcyBvYmplY3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICA7XHJcbiAgICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2UgaWYoeC5jbGFzc0xpc3QuY29udGFpbnMoXCJmYS1zdGFyXCIpKXtcclxuXHJcbiAgICAgICAgeC5jbGFzc0xpc3QucmVtb3ZlKFwiZmEtc3RhclwiKVxyXG4gICAgICAgIHguY2xhc3NMaXN0LmFkZChcImZhLXN0YXItb1wiKVxyXG4gICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBhcGlfdXJsLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdERUxFVEUnLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzdWx0XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIDtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcbiQoJy5jbG9zZS1pY29uJykub24oJ2NsaWNrJyxmdW5jdGlvbigpIHtcclxuICAkKHRoaXMpLmNsb3Nlc3QoJy5jYXJkJykuY3NzKHtcImRpc3BsYXlcIjpcIm5vbmVcIn0pO1xyXG4gICQoXCIjcmVzdGF1cmFudFwiKS5mYWRlSW4oKTtcclxufSkiLCIoZnVuY3Rpb24oJCl7XCJ1c2Ugc3RyaWN0XCI7dmFyIE1hZ2ljU3VnZ2VzdD1mdW5jdGlvbihlbGVtZW50LG9wdGlvbnMpe3ZhciBtcz10aGlzO3ZhciBkZWZhdWx0cz17YWxsb3dGcmVlRW50cmllczp0cnVlLGFsbG93RHVwbGljYXRlczpmYWxzZSxhamF4Q29uZmlnOnt9LGF1dG9TZWxlY3Q6dHJ1ZSxzZWxlY3RGaXJzdDpmYWxzZSxxdWVyeVBhcmFtOlwicXVlcnlcIixiZWZvcmVTZW5kOmZ1bmN0aW9uKCl7fSxjbHM6XCJcIixkYXRhOm51bGwsZGF0YVVybFBhcmFtczp7fSxkaXNhYmxlZDpmYWxzZSxkaXNhYmxlZEZpZWxkOm51bGwsZGlzcGxheUZpZWxkOlwibmFtZVwiLGVkaXRhYmxlOnRydWUsZXhwYW5kZWQ6ZmFsc2UsZXhwYW5kT25Gb2N1czpmYWxzZSxncm91cEJ5Om51bGwsaGlkZVRyaWdnZXI6ZmFsc2UsaGlnaGxpZ2h0OnRydWUsaWQ6bnVsbCxpbmZvTXNnQ2xzOlwiXCIsaW5wdXRDZmc6e30saW52YWxpZENsczpcIm1zLWludlwiLG1hdGNoQ2FzZTpmYWxzZSxtYXhEcm9wSGVpZ2h0OjI5MCxtYXhFbnRyeUxlbmd0aDpudWxsLG1heEVudHJ5UmVuZGVyZXI6ZnVuY3Rpb24odil7cmV0dXJuXCJQbGVhc2UgcmVkdWNlIHlvdXIgZW50cnkgYnkgXCIrditcIiBjaGFyYWN0ZXJcIisodj4xP1wic1wiOlwiXCIpfSxtYXhTdWdnZXN0aW9uczpudWxsLG1heFNlbGVjdGlvbjoxMCxtYXhTZWxlY3Rpb25SZW5kZXJlcjpmdW5jdGlvbih2KXtyZXR1cm5cIllvdSBjYW5ub3QgY2hvb3NlIG1vcmUgdGhhbiBcIit2K1wiIGl0ZW1cIisodj4xP1wic1wiOlwiXCIpfSxtZXRob2Q6XCJQT1NUXCIsbWluQ2hhcnM6MCxtaW5DaGFyc1JlbmRlcmVyOmZ1bmN0aW9uKHYpe3JldHVyblwiUGxlYXNlIHR5cGUgXCIrditcIiBtb3JlIGNoYXJhY3RlclwiKyh2PjE/XCJzXCI6XCJcIil9LG1vZGU6XCJsb2NhbFwiLG5hbWU6bnVsbCxub1N1Z2dlc3Rpb25UZXh0OlwiTm8gc3VnZ2VzdGlvbnNcIixwbGFjZWhvbGRlcjpcIlR5cGUgb3IgY2xpY2sgaGVyZVwiLHJlbmRlcmVyOm51bGwscmVxdWlyZWQ6ZmFsc2UscmVzdWx0QXNTdHJpbmc6ZmFsc2UscmVzdWx0QXNTdHJpbmdEZWxpbWl0ZXI6XCIsXCIscmVzdWx0c0ZpZWxkOlwicmVzdWx0c1wiLHNlbGVjdGlvbkNsczpcIlwiLHNlbGVjdGlvbkNvbnRhaW5lcjpudWxsLHNlbGVjdGlvblBvc2l0aW9uOlwiaW5uZXJcIixzZWxlY3Rpb25SZW5kZXJlcjpudWxsLHNlbGVjdGlvblN0YWNrZWQ6ZmFsc2Usc29ydERpcjpcImFzY1wiLHNvcnRPcmRlcjpudWxsLHN0cmljdFN1Z2dlc3Q6ZmFsc2Usc3R5bGU6XCJcIix0b2dnbGVPbkNsaWNrOmZhbHNlLHR5cGVEZWxheTo0MDAsdXNlVGFiS2V5OmZhbHNlLHVzZUNvbW1hS2V5OnRydWUsdXNlWmVicmFTdHlsZTpmYWxzZSx2YWx1ZTpudWxsLHZhbHVlRmllbGQ6XCJpZFwiLHZyZWdleDpudWxsLHZ0eXBlOm51bGx9O3ZhciBjb25mPSQuZXh0ZW5kKHt9LG9wdGlvbnMpO3ZhciBjZmc9JC5leHRlbmQodHJ1ZSx7fSxkZWZhdWx0cyxjb25mKTt0aGlzLmFkZFRvU2VsZWN0aW9uPWZ1bmN0aW9uKGl0ZW1zLGlzU2lsZW50KXtpZighY2ZnLm1heFNlbGVjdGlvbnx8X3NlbGVjdGlvbi5sZW5ndGg8Y2ZnLm1heFNlbGVjdGlvbil7aWYoISQuaXNBcnJheShpdGVtcykpe2l0ZW1zPVtpdGVtc119dmFyIHZhbHVlY2hhbmdlZD1mYWxzZTskLmVhY2goaXRlbXMsZnVuY3Rpb24oaW5kZXgsanNvbil7aWYoY2ZnLmFsbG93RHVwbGljYXRlc3x8JC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLG1zLmdldFZhbHVlKCkpPT09LTEpe19zZWxlY3Rpb24ucHVzaChqc29uKTt2YWx1ZWNoYW5nZWQ9dHJ1ZX19KTtpZih2YWx1ZWNoYW5nZWQ9PT10cnVlKXtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTt0aGlzLmVtcHR5KCk7aWYoaXNTaWxlbnQhPT10cnVlKXskKHRoaXMpLnRyaWdnZXIoXCJzZWxlY3Rpb25jaGFuZ2VcIixbdGhpcyx0aGlzLmdldFNlbGVjdGlvbigpXSl9fX10aGlzLmlucHV0LmF0dHIoXCJwbGFjZWhvbGRlclwiLGNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIiYmdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKX07dGhpcy5jbGVhcj1mdW5jdGlvbihpc1NpbGVudCl7dGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uKF9zZWxlY3Rpb24uc2xpY2UoMCksaXNTaWxlbnQpfTt0aGlzLmNvbGxhcHNlPWZ1bmN0aW9uKCl7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7dGhpcy5jb21ib2JveC5kZXRhY2goKTtjZmcuZXhwYW5kZWQ9ZmFsc2U7JCh0aGlzKS50cmlnZ2VyKFwiY29sbGFwc2VcIixbdGhpc10pfX07dGhpcy5kaXNhYmxlPWZ1bmN0aW9uKCl7dGhpcy5jb250YWluZXIuYWRkQ2xhc3MoXCJtcy1jdG4tZGlzYWJsZWRcIik7Y2ZnLmRpc2FibGVkPXRydWU7bXMuaW5wdXQuYXR0cihcImRpc2FibGVkXCIsdHJ1ZSl9O3RoaXMuZW1wdHk9ZnVuY3Rpb24oKXt0aGlzLmlucHV0LnZhbChcIlwiKX07dGhpcy5lbmFibGU9ZnVuY3Rpb24oKXt0aGlzLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcIm1zLWN0bi1kaXNhYmxlZFwiKTtjZmcuZGlzYWJsZWQ9ZmFsc2U7bXMuaW5wdXQuYXR0cihcImRpc2FibGVkXCIsZmFsc2UpfTt0aGlzLmV4cGFuZD1mdW5jdGlvbigpe2lmKCFjZmcuZXhwYW5kZWQmJih0aGlzLmlucHV0LnZhbCgpLmxlbmd0aD49Y2ZnLm1pbkNoYXJzfHx0aGlzLmNvbWJvYm94LmNoaWxkcmVuKCkuc2l6ZSgpPjApKXt0aGlzLmNvbWJvYm94LmFwcGVuZFRvKHRoaXMuY29udGFpbmVyKTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtjZmcuZXhwYW5kZWQ9dHJ1ZTskKHRoaXMpLnRyaWdnZXIoXCJleHBhbmRcIixbdGhpc10pfX07dGhpcy5pc0Rpc2FibGVkPWZ1bmN0aW9uKCl7cmV0dXJuIGNmZy5kaXNhYmxlZH07dGhpcy5pc1ZhbGlkPWZ1bmN0aW9uKCl7dmFyIHZhbGlkPWNmZy5yZXF1aXJlZD09PWZhbHNlfHxfc2VsZWN0aW9uLmxlbmd0aD4wO2lmKGNmZy52dHlwZXx8Y2ZnLnZyZWdleCl7JC5lYWNoKF9zZWxlY3Rpb24sZnVuY3Rpb24oaW5kZXgsaXRlbSl7dmFsaWQ9dmFsaWQmJnNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbShpdGVtW2NmZy52YWx1ZUZpZWxkXSl9KX1yZXR1cm4gdmFsaWR9O3RoaXMuZ2V0RGF0YVVybFBhcmFtcz1mdW5jdGlvbigpe3JldHVybiBjZmcuZGF0YVVybFBhcmFtc307dGhpcy5nZXROYW1lPWZ1bmN0aW9uKCl7cmV0dXJuIGNmZy5uYW1lfTt0aGlzLmdldFNlbGVjdGlvbj1mdW5jdGlvbigpe3JldHVybiBfc2VsZWN0aW9ufTt0aGlzLmdldFJhd1ZhbHVlPWZ1bmN0aW9uKCl7cmV0dXJuIG1zLmlucHV0LnZhbCgpfTt0aGlzLmdldFZhbHVlPWZ1bmN0aW9uKCl7cmV0dXJuICQubWFwKF9zZWxlY3Rpb24sZnVuY3Rpb24obyl7cmV0dXJuIG9bY2ZnLnZhbHVlRmllbGRdfSl9O3RoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbj1mdW5jdGlvbihpdGVtcyxpc1NpbGVudCl7aWYoISQuaXNBcnJheShpdGVtcykpe2l0ZW1zPVtpdGVtc119dmFyIHZhbHVlY2hhbmdlZD1mYWxzZTskLmVhY2goaXRlbXMsZnVuY3Rpb24oaW5kZXgsanNvbil7dmFyIGk9JC5pbkFycmF5KGpzb25bY2ZnLnZhbHVlRmllbGRdLG1zLmdldFZhbHVlKCkpO2lmKGk+LTEpe19zZWxlY3Rpb24uc3BsaWNlKGksMSk7dmFsdWVjaGFuZ2VkPXRydWV9fSk7aWYodmFsdWVjaGFuZ2VkPT09dHJ1ZSl7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7aWYoaXNTaWxlbnQhPT10cnVlKXskKHRoaXMpLnRyaWdnZXIoXCJzZWxlY3Rpb25jaGFuZ2VcIixbdGhpcyx0aGlzLmdldFNlbGVjdGlvbigpXSl9aWYoY2ZnLmV4cGFuZE9uRm9jdXMpe21zLmV4cGFuZCgpfWlmKGNmZy5leHBhbmRlZCl7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9fXRoaXMuaW5wdXQuYXR0cihcInBsYWNlaG9sZGVyXCIsY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiZ0aGlzLmdldFZhbHVlKCkubGVuZ3RoPjA/XCJcIjpjZmcucGxhY2Vob2xkZXIpfTt0aGlzLmdldERhdGE9ZnVuY3Rpb24oKXtyZXR1cm4gX2NiRGF0YX07dGhpcy5zZXREYXRhPWZ1bmN0aW9uKGRhdGEpe2NmZy5kYXRhPWRhdGE7c2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCl9O3RoaXMuc2V0TmFtZT1mdW5jdGlvbihuYW1lKXtjZmcubmFtZT1uYW1lO2lmKG5hbWUpe2NmZy5uYW1lKz1uYW1lLmluZGV4T2YoXCJbXVwiKT4wP1wiXCI6XCJbXVwifWlmKG1zLl92YWx1ZUNvbnRhaW5lcil7JC5lYWNoKG1zLl92YWx1ZUNvbnRhaW5lci5jaGlsZHJlbigpLGZ1bmN0aW9uKGksZWwpe2VsLm5hbWU9Y2ZnLm5hbWV9KX19O3RoaXMuc2V0U2VsZWN0aW9uPWZ1bmN0aW9uKGl0ZW1zKXt0aGlzLmNsZWFyKCk7dGhpcy5hZGRUb1NlbGVjdGlvbihpdGVtcyl9O3RoaXMuc2V0VmFsdWU9ZnVuY3Rpb24odmFsdWVzKXt2YXIgaXRlbXM9W107JC5lYWNoKHZhbHVlcyxmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIGZvdW5kPWZhbHNlOyQuZWFjaChfY2JEYXRhLGZ1bmN0aW9uKGksaXRlbSl7aWYoaXRlbVtjZmcudmFsdWVGaWVsZF09PXZhbHVlKXtpdGVtcy5wdXNoKGl0ZW0pO2ZvdW5kPXRydWU7cmV0dXJuIGZhbHNlfX0pO2lmKCFmb3VuZCl7aWYodHlwZW9mIHZhbHVlPT09XCJvYmplY3RcIil7aXRlbXMucHVzaCh2YWx1ZSl9ZWxzZXt2YXIganNvbj17fTtqc29uW2NmZy52YWx1ZUZpZWxkXT12YWx1ZTtqc29uW2NmZy5kaXNwbGF5RmllbGRdPXZhbHVlO2l0ZW1zLnB1c2goanNvbil9fX0pO2lmKGl0ZW1zLmxlbmd0aD4wKXt0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKX19O3RoaXMuc2V0RGF0YVVybFBhcmFtcz1mdW5jdGlvbihwYXJhbXMpe2NmZy5kYXRhVXJsUGFyYW1zPSQuZXh0ZW5kKHt9LHBhcmFtcyl9O3ZhciBfc2VsZWN0aW9uPVtdLF9jb21ib0l0ZW1IZWlnaHQ9MCxfdGltZXIsX2hhc0ZvY3VzPWZhbHNlLF9ncm91cHM9bnVsbCxfY2JEYXRhPVtdLF9jdHJsRG93bj1mYWxzZSxLRVlDT0RFUz17QkFDS1NQQUNFOjgsVEFCOjksRU5URVI6MTMsQ1RSTDoxNyxFU0M6MjcsU1BBQ0U6MzIsVVBBUlJPVzozOCxET1dOQVJST1c6NDAsQ09NTUE6MTg4fTt2YXIgc2VsZj17X2Rpc3BsYXlTdWdnZXN0aW9uczpmdW5jdGlvbihkYXRhKXttcy5jb21ib2JveC5zaG93KCk7bXMuY29tYm9ib3guZW1wdHkoKTt2YXIgcmVzSGVpZ2h0PTAsbmJHcm91cHM9MDtpZihfZ3JvdXBzPT09bnVsbCl7c2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhkYXRhKTtyZXNIZWlnaHQ9X2NvbWJvSXRlbUhlaWdodCpkYXRhLmxlbmd0aH1lbHNle2Zvcih2YXIgZ3JwTmFtZSBpbiBfZ3JvdXBzKXtuYkdyb3Vwcys9MTskKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXJlcy1ncm91cFwiLGh0bWw6Z3JwTmFtZX0pLmFwcGVuZFRvKG1zLmNvbWJvYm94KTtzZWxmLl9yZW5kZXJDb21ib0l0ZW1zKF9ncm91cHNbZ3JwTmFtZV0uaXRlbXMsdHJ1ZSl9dmFyIF9ncm91cEl0ZW1IZWlnaHQ9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtZ3JvdXBcIikub3V0ZXJIZWlnaHQoKTtpZihfZ3JvdXBJdGVtSGVpZ2h0IT09bnVsbCl7dmFyIHRtcFJlc0hlaWdodD1uYkdyb3VwcypfZ3JvdXBJdGVtSGVpZ2h0O3Jlc0hlaWdodD1fY29tYm9JdGVtSGVpZ2h0KmRhdGEubGVuZ3RoK3RtcFJlc0hlaWdodH1lbHNle3Jlc0hlaWdodD1fY29tYm9JdGVtSGVpZ2h0KihkYXRhLmxlbmd0aCtuYkdyb3Vwcyl9fWlmKHJlc0hlaWdodDxtcy5jb21ib2JveC5oZWlnaHQoKXx8cmVzSGVpZ2h0PD1jZmcubWF4RHJvcEhlaWdodCl7bXMuY29tYm9ib3guaGVpZ2h0KHJlc0hlaWdodCl9ZWxzZSBpZihyZXNIZWlnaHQ+PW1zLmNvbWJvYm94LmhlaWdodCgpJiZyZXNIZWlnaHQ+Y2ZnLm1heERyb3BIZWlnaHQpe21zLmNvbWJvYm94LmhlaWdodChjZmcubWF4RHJvcEhlaWdodCl9aWYoZGF0YS5sZW5ndGg9PT0xJiZjZmcuYXV0b1NlbGVjdD09PXRydWUpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkuZmlsdGVyKFwiOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmxhc3RcIikuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9aWYoY2ZnLnNlbGVjdEZpcnN0PT09dHJ1ZSl7bXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoXCI6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIikuYWRkQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIil9aWYoZGF0YS5sZW5ndGg9PT0wJiZtcy5nZXRSYXdWYWx1ZSgpIT09XCJcIil7dmFyIG5vU3VnZ2VzdGlvblRleHQ9Y2ZnLm5vU3VnZ2VzdGlvblRleHQucmVwbGFjZSgvXFx7XFx7LipcXH1cXH0vLG1zLmlucHV0LnZhbCgpKTtzZWxmLl91cGRhdGVIZWxwZXIobm9TdWdnZXN0aW9uVGV4dCk7bXMuY29sbGFwc2UoKX1pZihjZmcuYWxsb3dGcmVlRW50cmllcz09PWZhbHNlKXtpZihkYXRhLmxlbmd0aD09PTApeyQobXMuaW5wdXQpLmFkZENsYXNzKGNmZy5pbnZhbGlkQ2xzKTttcy5jb21ib2JveC5oaWRlKCl9ZWxzZXskKG1zLmlucHV0KS5yZW1vdmVDbGFzcyhjZmcuaW52YWxpZENscyl9fX0sX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXk6ZnVuY3Rpb24oZGF0YSl7dmFyIGpzb249W107JC5lYWNoKGRhdGEsZnVuY3Rpb24oaW5kZXgscyl7dmFyIGVudHJ5PXt9O2VudHJ5W2NmZy5kaXNwbGF5RmllbGRdPWVudHJ5W2NmZy52YWx1ZUZpZWxkXT0kLnRyaW0ocyk7anNvbi5wdXNoKGVudHJ5KX0pO3JldHVybiBqc29ufSxfaGlnaGxpZ2h0U3VnZ2VzdGlvbjpmdW5jdGlvbihodG1sKXt2YXIgcT1tcy5pbnB1dC52YWwoKTt2YXIgc3BlY2lhbENoYXJhY3RlcnM9W1wiXlwiLFwiJFwiLFwiKlwiLFwiK1wiLFwiP1wiLFwiLlwiLFwiKFwiLFwiKVwiLFwiOlwiLFwiIVwiLFwifFwiLFwie1wiLFwifVwiLFwiW1wiLFwiXVwiXTskLmVhY2goc3BlY2lhbENoYXJhY3RlcnMsZnVuY3Rpb24oaW5kZXgsdmFsdWUpe3E9cS5yZXBsYWNlKHZhbHVlLFwiXFxcXFwiK3ZhbHVlKX0pO2lmKHEubGVuZ3RoPT09MCl7cmV0dXJuIGh0bWx9dmFyIGdsb2I9Y2ZnLm1hdGNoQ2FzZT09PXRydWU/XCJnXCI6XCJnaVwiO3JldHVybiBodG1sLnJlcGxhY2UobmV3IFJlZ0V4cChcIihcIitxK1wiKSg/IShbXjxdKyk/PilcIixnbG9iKSxcIjxlbT4kMTwvZW0+XCIpfSxfbW92ZVNlbGVjdGVkUm93OmZ1bmN0aW9uKGRpcil7aWYoIWNmZy5leHBhbmRlZCl7bXMuZXhwYW5kKCl9dmFyIGxpc3Qsc3RhcnQsYWN0aXZlLHNjcm9sbFBvcztsaXN0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZClcIik7aWYoZGlyPT09XCJkb3duXCIpe3N0YXJ0PWxpc3QuZXEoMCl9ZWxzZXtzdGFydD1saXN0LmZpbHRlcihcIjpsYXN0XCIpfWFjdGl2ZT1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKTtpZihhY3RpdmUubGVuZ3RoPjApe2lmKGRpcj09PVwiZG93blwiKXtzdGFydD1hY3RpdmUubmV4dEFsbChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKS5maXJzdCgpO2lmKHN0YXJ0Lmxlbmd0aD09PTApe3N0YXJ0PWxpc3QuZXEoMCl9c2Nyb2xsUG9zPW1zLmNvbWJvYm94LnNjcm9sbFRvcCgpO21zLmNvbWJvYm94LnNjcm9sbFRvcCgwKTtpZihzdGFydFswXS5vZmZzZXRUb3Arc3RhcnQub3V0ZXJIZWlnaHQoKT5tcy5jb21ib2JveC5oZWlnaHQoKSl7bXMuY29tYm9ib3guc2Nyb2xsVG9wKHNjcm9sbFBvcytfY29tYm9JdGVtSGVpZ2h0KX19ZWxzZXtzdGFydD1hY3RpdmUucHJldkFsbChcIi5tcy1yZXMtaXRlbTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKVwiKS5maXJzdCgpO2lmKHN0YXJ0Lmxlbmd0aD09PTApe3N0YXJ0PWxpc3QuZmlsdGVyKFwiOmxhc3RcIik7bXMuY29tYm9ib3guc2Nyb2xsVG9wKF9jb21ib0l0ZW1IZWlnaHQqbGlzdC5sZW5ndGgpfWlmKHN0YXJ0WzBdLm9mZnNldFRvcDxtcy5jb21ib2JveC5zY3JvbGxUb3AoKSl7bXMuY29tYm9ib3guc2Nyb2xsVG9wKG1zLmNvbWJvYm94LnNjcm9sbFRvcCgpLV9jb21ib0l0ZW1IZWlnaHQpfX19bGlzdC5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtzdGFydC5hZGRDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKX0sX3Byb2Nlc3NTdWdnZXN0aW9uczpmdW5jdGlvbihzb3VyY2Upe3ZhciBqc29uPW51bGwsZGF0YT1zb3VyY2V8fGNmZy5kYXRhO2lmKGRhdGEhPT1udWxsKXtpZih0eXBlb2YgZGF0YT09PVwiZnVuY3Rpb25cIil7ZGF0YT1kYXRhLmNhbGwobXMsbXMuZ2V0UmF3VmFsdWUoKSl9aWYodHlwZW9mIGRhdGE9PT1cInN0cmluZ1wiKXskKG1zKS50cmlnZ2VyKFwiYmVmb3JlbG9hZFwiLFttc10pO3ZhciBxdWVyeVBhcmFtcz17fTtxdWVyeVBhcmFtc1tjZmcucXVlcnlQYXJhbV09bXMuaW5wdXQudmFsKCk7dmFyIHBhcmFtcz0kLmV4dGVuZChxdWVyeVBhcmFtcyxjZmcuZGF0YVVybFBhcmFtcyk7JC5hamF4KCQuZXh0ZW5kKHt0eXBlOmNmZy5tZXRob2QsdXJsOmRhdGEsZGF0YTpwYXJhbXMsYmVmb3JlU2VuZDpjZmcuYmVmb3JlU2VuZCxzdWNjZXNzOmZ1bmN0aW9uKGFzeW5jRGF0YSl7anNvbj10eXBlb2YgYXN5bmNEYXRhPT09XCJzdHJpbmdcIj9KU09OLnBhcnNlKGFzeW5jRGF0YSk6YXN5bmNEYXRhO3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucyhqc29uKTskKG1zKS50cmlnZ2VyKFwibG9hZFwiLFttcyxqc29uXSk7aWYoc2VsZi5fYXN5bmNWYWx1ZXMpe21zLnNldFZhbHVlKHR5cGVvZiBzZWxmLl9hc3luY1ZhbHVlcz09PVwic3RyaW5nXCI/SlNPTi5wYXJzZShzZWxmLl9hc3luY1ZhbHVlcyk6c2VsZi5fYXN5bmNWYWx1ZXMpO3NlbGYuX3JlbmRlclNlbGVjdGlvbigpO2RlbGV0ZSBzZWxmLl9hc3luY1ZhbHVlc319LGVycm9yOmZ1bmN0aW9uKCl7dGhyb3dcIkNvdWxkIG5vdCByZWFjaCBzZXJ2ZXJcIn19LGNmZy5hamF4Q29uZmlnKSk7cmV0dXJufWVsc2V7aWYoZGF0YS5sZW5ndGg+MCYmdHlwZW9mIGRhdGFbMF09PT1cInN0cmluZ1wiKXtfY2JEYXRhPXNlbGYuX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXkoZGF0YSl9ZWxzZXtfY2JEYXRhPWRhdGFbY2ZnLnJlc3VsdHNGaWVsZF18fGRhdGF9fXZhciBzb3J0ZWREYXRhPWNmZy5tb2RlPT09XCJyZW1vdGVcIj9fY2JEYXRhOnNlbGYuX3NvcnRBbmRUcmltKF9jYkRhdGEpO3NlbGYuX2Rpc3BsYXlTdWdnZXN0aW9ucyhzZWxmLl9ncm91cChzb3J0ZWREYXRhKSl9fSxfcmVuZGVyOmZ1bmN0aW9uKGVsKXttcy5zZXROYW1lKGNmZy5uYW1lKTttcy5jb250YWluZXI9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1jdG4gZm9ybS1jb250cm9sIFwiKyhjZmcucmVzdWx0QXNTdHJpbmc/XCJtcy1hcy1zdHJpbmcgXCI6XCJcIikrY2ZnLmNscysoJChlbCkuaGFzQ2xhc3MoXCJpbnB1dC1sZ1wiKT9cIiBpbnB1dC1sZ1wiOlwiXCIpKygkKGVsKS5oYXNDbGFzcyhcImlucHV0LXNtXCIpP1wiIGlucHV0LXNtXCI6XCJcIikrKGNmZy5kaXNhYmxlZD09PXRydWU/XCIgbXMtY3RuLWRpc2FibGVkXCI6XCJcIikrKGNmZy5lZGl0YWJsZT09PXRydWU/XCJcIjpcIiBtcy1jdG4tcmVhZG9ubHlcIikrKGNmZy5oaWRlVHJpZ2dlcj09PWZhbHNlP1wiXCI6XCIgbXMtbm8tdHJpZ2dlclwiKSxzdHlsZTpjZmcuc3R5bGUsaWQ6Y2ZnLmlkfSk7bXMuY29udGFpbmVyLmZvY3VzKCQucHJveHkoaGFuZGxlcnMuX29uRm9jdXMsdGhpcykpO21zLmNvbnRhaW5lci5ibHVyKCQucHJveHkoaGFuZGxlcnMuX29uQmx1cix0aGlzKSk7bXMuY29udGFpbmVyLmtleWRvd24oJC5wcm94eShoYW5kbGVycy5fb25LZXlEb3duLHRoaXMpKTttcy5jb250YWluZXIua2V5dXAoJC5wcm94eShoYW5kbGVycy5fb25LZXlVcCx0aGlzKSk7bXMuaW5wdXQ9JChcIjxpbnB1dC8+XCIsJC5leHRlbmQoe3R5cGU6XCJ0ZXh0XCIsXCJjbGFzc1wiOmNmZy5lZGl0YWJsZT09PXRydWU/XCJcIjpcIiBtcy1pbnB1dC1yZWFkb25seVwiLHJlYWRvbmx5OiFjZmcuZWRpdGFibGUscGxhY2Vob2xkZXI6Y2ZnLnBsYWNlaG9sZGVyLGRpc2FibGVkOmNmZy5kaXNhYmxlZH0sY2ZnLmlucHV0Q2ZnKSk7bXMuaW5wdXQuZm9jdXMoJC5wcm94eShoYW5kbGVycy5fb25JbnB1dEZvY3VzLHRoaXMpKTttcy5pbnB1dC5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Q2xpY2ssdGhpcykpO21zLmNvbWJvYm94PSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtcmVzLWN0biBkcm9wZG93bi1tZW51XCJ9KS5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO21zLmNvbWJvYm94Lm9uKFwiY2xpY2tcIixcImRpdi5tcy1yZXMtaXRlbVwiLCQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtU2VsZWN0ZWQsdGhpcykpO21zLmNvbWJvYm94Lm9uKFwibW91c2VvdmVyXCIsXCJkaXYubXMtcmVzLWl0ZW1cIiwkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbU1vdXNlT3Zlcix0aGlzKSk7aWYoY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuc2VsZWN0aW9uQ29udGFpbmVyPWNmZy5zZWxlY3Rpb25Db250YWluZXI7JChtcy5zZWxlY3Rpb25Db250YWluZXIpLmFkZENsYXNzKFwibXMtc2VsLWN0blwiKX1lbHNle21zLnNlbGVjdGlvbkNvbnRhaW5lcj0kKFwiPGRpdi8+XCIse1wiY2xhc3NcIjpcIm1zLXNlbC1jdG5cIn0pfW1zLnNlbGVjdGlvbkNvbnRhaW5lci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLHRoaXMpKTtpZihjZmcuc2VsZWN0aW9uUG9zaXRpb249PT1cImlubmVyXCImJiFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXttcy5zZWxlY3Rpb25Db250YWluZXIuYXBwZW5kKG1zLmlucHV0KX1lbHNle21zLmNvbnRhaW5lci5hcHBlbmQobXMuaW5wdXQpfW1zLmhlbHBlcj0kKFwiPHNwYW4vPlwiLHtcImNsYXNzXCI6XCJtcy1oZWxwZXIgXCIrY2ZnLmluZm9Nc2dDbHN9KTtzZWxmLl91cGRhdGVIZWxwZXIoKTttcy5jb250YWluZXIuYXBwZW5kKG1zLmhlbHBlcik7JChlbCkucmVwbGFjZVdpdGgobXMuY29udGFpbmVyKTtpZighY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7c3dpdGNoKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbil7Y2FzZVwiYm90dG9tXCI6bXMuc2VsZWN0aW9uQ29udGFpbmVyLmluc2VydEFmdGVyKG1zLmNvbnRhaW5lcik7aWYoY2ZnLnNlbGVjdGlvblN0YWNrZWQ9PT10cnVlKXttcy5zZWxlY3Rpb25Db250YWluZXIud2lkdGgobXMuY29udGFpbmVyLndpZHRoKCkpO21zLnNlbGVjdGlvbkNvbnRhaW5lci5hZGRDbGFzcyhcIm1zLXN0YWNrZWRcIil9YnJlYWs7Y2FzZVwicmlnaHRcIjptcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTttcy5jb250YWluZXIuY3NzKFwiZmxvYXRcIixcImxlZnRcIik7YnJlYWs7ZGVmYXVsdDptcy5jb250YWluZXIuYXBwZW5kKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7YnJlYWt9fWlmKGNmZy5oaWRlVHJpZ2dlcj09PWZhbHNlKXttcy50cmlnZ2VyPSQoXCI8ZGl2Lz5cIix7XCJjbGFzc1wiOlwibXMtdHJpZ2dlclwiLGh0bWw6JzxkaXYgY2xhc3M9XCJtcy10cmlnZ2VyLWljb1wiPjwvZGl2Pid9KTttcy50cmlnZ2VyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVHJpZ2dlckNsaWNrLHRoaXMpKTttcy5jb250YWluZXIuYXBwZW5kKG1zLnRyaWdnZXIpfSQod2luZG93KS5yZXNpemUoJC5wcm94eShoYW5kbGVycy5fb25XaW5kb3dSZXNpemVkLHRoaXMpKTtpZihjZmcudmFsdWUhPT1udWxsfHxjZmcuZGF0YSE9PW51bGwpe2lmKHR5cGVvZiBjZmcuZGF0YT09PVwic3RyaW5nXCIpe3NlbGYuX2FzeW5jVmFsdWVzPWNmZy52YWx1ZTtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX1lbHNle3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO2lmKGNmZy52YWx1ZSE9PW51bGwpe21zLnNldFZhbHVlKGNmZy52YWx1ZSk7c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCl9fX0kKFwiYm9keVwiKS5jbGljayhmdW5jdGlvbihlKXtpZihtcy5jb250YWluZXIuaGFzQ2xhc3MoXCJtcy1jdG4tZm9jdXNcIikmJm1zLmNvbnRhaW5lci5oYXMoZS50YXJnZXQpLmxlbmd0aD09PTAmJmUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKFwibXMtcmVzLWl0ZW1cIik8MCYmZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoXCJtcy1jbG9zZS1idG5cIik8MCYmbXMuY29udGFpbmVyWzBdIT09ZS50YXJnZXQpe2hhbmRsZXJzLl9vbkJsdXIoKX19KTtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXtjZmcuZXhwYW5kZWQ9ZmFsc2U7bXMuZXhwYW5kKCl9fSxfcmVuZGVyQ29tYm9JdGVtczpmdW5jdGlvbihpdGVtcyxpc0dyb3VwZWQpe3ZhciByZWY9dGhpcyxodG1sPVwiXCI7JC5lYWNoKGl0ZW1zLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgZGlzcGxheWVkPWNmZy5yZW5kZXJlciE9PW51bGw/Y2ZnLnJlbmRlcmVyLmNhbGwocmVmLHZhbHVlKTp2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTt2YXIgZGlzYWJsZWQ9Y2ZnLmRpc2FibGVkRmllbGQhPT1udWxsJiZ2YWx1ZVtjZmcuZGlzYWJsZWRGaWVsZF09PT10cnVlO3ZhciByZXN1bHRJdGVtRWw9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1yZXMtaXRlbSBcIisoaXNHcm91cGVkP1wibXMtcmVzLWl0ZW0tZ3JvdXBlZCBcIjpcIlwiKSsoZGlzYWJsZWQ/XCJtcy1yZXMtaXRlbS1kaXNhYmxlZCBcIjpcIlwiKSsoaW5kZXglMj09PTEmJmNmZy51c2VaZWJyYVN0eWxlPT09dHJ1ZT9cIm1zLXJlcy1vZGRcIjpcIlwiKSxodG1sOmNmZy5oaWdobGlnaHQ9PT10cnVlP3NlbGYuX2hpZ2hsaWdodFN1Z2dlc3Rpb24oZGlzcGxheWVkKTpkaXNwbGF5ZWQsXCJkYXRhLWpzb25cIjpKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KTtodG1sKz0kKFwiPGRpdi8+XCIpLmFwcGVuZChyZXN1bHRJdGVtRWwpLmh0bWwoKX0pO21zLmNvbWJvYm94LmFwcGVuZChodG1sKTtfY29tYm9JdGVtSGVpZ2h0PW1zLmNvbWJvYm94LmZpbmQoXCIubXMtcmVzLWl0ZW06Zmlyc3RcIikub3V0ZXJIZWlnaHQoKX0sX3JlbmRlclNlbGVjdGlvbjpmdW5jdGlvbigpe3ZhciByZWY9dGhpcyx3PTAsaW5wdXRPZmZzZXQ9MCxpdGVtcz1bXSxhc1RleHQ9Y2ZnLnJlc3VsdEFzU3RyaW5nPT09dHJ1ZSYmIV9oYXNGb2N1czttcy5zZWxlY3Rpb25Db250YWluZXIuZmluZChcIi5tcy1zZWwtaXRlbVwiKS5yZW1vdmUoKTtpZihtcy5fdmFsdWVDb250YWluZXIhPT11bmRlZmluZWQpe21zLl92YWx1ZUNvbnRhaW5lci5yZW1vdmUoKX0kLmVhY2goX3NlbGVjdGlvbixmdW5jdGlvbihpbmRleCx2YWx1ZSl7dmFyIHNlbGVjdGVkSXRlbUVsLGRlbEl0ZW1FbCxzZWxlY3RlZEl0ZW1IdG1sPWNmZy5zZWxlY3Rpb25SZW5kZXJlciE9PW51bGw/Y2ZnLnNlbGVjdGlvblJlbmRlcmVyLmNhbGwocmVmLHZhbHVlKTp2YWx1ZVtjZmcuZGlzcGxheUZpZWxkXTt2YXIgdmFsaWRDbHM9c2VsZi5fdmFsaWRhdGVTaW5nbGVJdGVtKHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdKT9cIlwiOlwiIG1zLXNlbC1pbnZhbGlkXCI7aWYoYXNUZXh0PT09dHJ1ZSl7c2VsZWN0ZWRJdGVtRWw9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtaXRlbSBtcy1zZWwtdGV4dCBcIitjZmcuc2VsZWN0aW9uQ2xzK3ZhbGlkQ2xzLGh0bWw6c2VsZWN0ZWRJdGVtSHRtbCsoaW5kZXg9PT1fc2VsZWN0aW9uLmxlbmd0aC0xP1wiXCI6Y2ZnLnJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyKX0pLmRhdGEoXCJqc29uXCIsdmFsdWUpfWVsc2V7c2VsZWN0ZWRJdGVtRWw9JChcIjxkaXYvPlwiLHtcImNsYXNzXCI6XCJtcy1zZWwtaXRlbSBcIitjZmcuc2VsZWN0aW9uQ2xzK3ZhbGlkQ2xzLGh0bWw6c2VsZWN0ZWRJdGVtSHRtbH0pLmRhdGEoXCJqc29uXCIsdmFsdWUpO2lmKGNmZy5kaXNhYmxlZD09PWZhbHNlKXtkZWxJdGVtRWw9JChcIjxzcGFuLz5cIix7XCJjbGFzc1wiOlwibXMtY2xvc2UtYnRuXCJ9KS5kYXRhKFwianNvblwiLHZhbHVlKS5hcHBlbmRUbyhzZWxlY3RlZEl0ZW1FbCk7ZGVsSXRlbUVsLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVGFnVHJpZ2dlckNsaWNrLHJlZikpfX1pdGVtcy5wdXNoKHNlbGVjdGVkSXRlbUVsKX0pO21zLnNlbGVjdGlvbkNvbnRhaW5lci5wcmVwZW5kKGl0ZW1zKTttcy5fdmFsdWVDb250YWluZXI9JChcIjxkaXYvPlwiLHtzdHlsZTpcImRpc3BsYXk6IG5vbmU7XCJ9KTskLmVhY2gobXMuZ2V0VmFsdWUoKSxmdW5jdGlvbihpLHZhbCl7dmFyIGVsPSQoXCI8aW5wdXQvPlwiLHt0eXBlOlwiaGlkZGVuXCIsbmFtZTpjZmcubmFtZSx2YWx1ZTp2YWx9KTtlbC5hcHBlbmRUbyhtcy5fdmFsdWVDb250YWluZXIpfSk7bXMuX3ZhbHVlQ29udGFpbmVyLmFwcGVuZFRvKG1zLnNlbGVjdGlvbkNvbnRhaW5lcik7aWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiYhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7bXMuaW5wdXQud2lkdGgoMCk7aW5wdXRPZmZzZXQ9bXMuaW5wdXQub2Zmc2V0KCkubGVmdC1tcy5zZWxlY3Rpb25Db250YWluZXIub2Zmc2V0KCkubGVmdDt3PW1zLmNvbnRhaW5lci53aWR0aCgpLWlucHV0T2Zmc2V0LTQyO21zLmlucHV0LndpZHRoKHcpfWlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsX3NlbGVjdGlvbi5sZW5ndGgpKX1lbHNle21zLmhlbHBlci5oaWRlKCl9fSxfc2VsZWN0SXRlbTpmdW5jdGlvbihpdGVtKXtpZihjZmcubWF4U2VsZWN0aW9uPT09MSl7X3NlbGVjdGlvbj1bXX1tcy5hZGRUb1NlbGVjdGlvbihpdGVtLmRhdGEoXCJqc29uXCIpKTtpdGVtLnJlbW92ZUNsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO2lmKGNmZy5leHBhbmRPbkZvY3VzPT09ZmFsc2V8fF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7bXMuY29sbGFwc2UoKX1pZighX2hhc0ZvY3VzKXttcy5pbnB1dC5mb2N1cygpfWVsc2UgaWYoX2hhc0ZvY3VzJiYoY2ZnLmV4cGFuZE9uRm9jdXN8fF9jdHJsRG93bikpe3NlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO2lmKF9jdHJsRG93bil7bXMuZXhwYW5kKCl9fX0sX3NvcnRBbmRUcmltOmZ1bmN0aW9uKGRhdGEpe3ZhciBxPW1zLmdldFJhd1ZhbHVlKCksZmlsdGVyZWQ9W10sbmV3U3VnZ2VzdGlvbnM9W10sc2VsZWN0ZWRWYWx1ZXM9bXMuZ2V0VmFsdWUoKTtpZihxLmxlbmd0aD4wKXskLmVhY2goZGF0YSxmdW5jdGlvbihpbmRleCxvYmope3ZhciBuYW1lPW9ialtjZmcuZGlzcGxheUZpZWxkXTtpZihjZmcubWF0Y2hDYXNlPT09dHJ1ZSYmbmFtZS5pbmRleE9mKHEpPi0xfHxjZmcubWF0Y2hDYXNlPT09ZmFsc2UmJm5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSk+LTEpe2lmKGNmZy5zdHJpY3RTdWdnZXN0PT09ZmFsc2V8fG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSk9PT0wKXtmaWx0ZXJlZC5wdXNoKG9iail9fX0pfWVsc2V7ZmlsdGVyZWQ9ZGF0YX0kLmVhY2goZmlsdGVyZWQsZnVuY3Rpb24oaW5kZXgsb2JqKXtpZihjZmcuYWxsb3dEdXBsaWNhdGVzfHwkLmluQXJyYXkob2JqW2NmZy52YWx1ZUZpZWxkXSxzZWxlY3RlZFZhbHVlcyk9PT0tMSl7bmV3U3VnZ2VzdGlvbnMucHVzaChvYmopfX0pO2lmKGNmZy5zb3J0T3JkZXIhPT1udWxsKXtuZXdTdWdnZXN0aW9ucy5zb3J0KGZ1bmN0aW9uKGEsYil7aWYoYVtjZmcuc29ydE9yZGVyXTxiW2NmZy5zb3J0T3JkZXJdKXtyZXR1cm4gY2ZnLnNvcnREaXI9PT1cImFzY1wiPy0xOjF9aWYoYVtjZmcuc29ydE9yZGVyXT5iW2NmZy5zb3J0T3JkZXJdKXtyZXR1cm4gY2ZnLnNvcnREaXI9PT1cImFzY1wiPzE6LTF9cmV0dXJuIDB9KX1pZihjZmcubWF4U3VnZ2VzdGlvbnMmJmNmZy5tYXhTdWdnZXN0aW9ucz4wKXtuZXdTdWdnZXN0aW9ucz1uZXdTdWdnZXN0aW9ucy5zbGljZSgwLGNmZy5tYXhTdWdnZXN0aW9ucyl9cmV0dXJuIG5ld1N1Z2dlc3Rpb25zfSxfZ3JvdXA6ZnVuY3Rpb24oZGF0YSl7aWYoY2ZnLmdyb3VwQnkhPT1udWxsKXtfZ3JvdXBzPXt9OyQuZWFjaChkYXRhLGZ1bmN0aW9uKGluZGV4LHZhbHVlKXt2YXIgcHJvcHM9Y2ZnLmdyb3VwQnkuaW5kZXhPZihcIi5cIik+LTE/Y2ZnLmdyb3VwQnkuc3BsaXQoXCIuXCIpOmNmZy5ncm91cEJ5O3ZhciBwcm9wPXZhbHVlW2NmZy5ncm91cEJ5XTtpZih0eXBlb2YgcHJvcHMhPVwic3RyaW5nXCIpe3Byb3A9dmFsdWU7d2hpbGUocHJvcHMubGVuZ3RoPjApe3Byb3A9cHJvcFtwcm9wcy5zaGlmdCgpXX19aWYoX2dyb3Vwc1twcm9wXT09PXVuZGVmaW5lZCl7X2dyb3Vwc1twcm9wXT17dGl0bGU6cHJvcCxpdGVtczpbdmFsdWVdfX1lbHNle19ncm91cHNbcHJvcF0uaXRlbXMucHVzaCh2YWx1ZSl9fSl9cmV0dXJuIGRhdGF9LF91cGRhdGVIZWxwZXI6ZnVuY3Rpb24oaHRtbCl7bXMuaGVscGVyLmh0bWwoaHRtbCk7aWYoIW1zLmhlbHBlci5pcyhcIjp2aXNpYmxlXCIpKXttcy5oZWxwZXIuZmFkZUluKCl9fSxfdmFsaWRhdGVTaW5nbGVJdGVtOmZ1bmN0aW9uKHZhbHVlKXtpZihjZmcudnJlZ2V4IT09bnVsbCYmY2ZnLnZyZWdleCBpbnN0YW5jZW9mIFJlZ0V4cCl7cmV0dXJuIGNmZy52cmVnZXgudGVzdCh2YWx1ZSl9ZWxzZSBpZihjZmcudnR5cGUhPT1udWxsKXtzd2l0Y2goY2ZnLnZ0eXBlKXtjYXNlXCJhbHBoYVwiOnJldHVybi9eW2EtekEtWl9dKyQvLnRlc3QodmFsdWUpO2Nhc2VcImFscGhhbnVtXCI6cmV0dXJuL15bYS16QS1aMC05X10rJC8udGVzdCh2YWx1ZSk7Y2FzZVwiZW1haWxcIjpyZXR1cm4vXihcXHcrKShbXFwtKy5dW1xcd10rKSpAKFxcd1tcXC1cXHddKlxcLil7MSw1fShbQS1aYS16XSl7Miw2fSQvLnRlc3QodmFsdWUpO2Nhc2VcInVybFwiOnJldHVybi8oKCheaHR0cHM/KXwoXmZ0cCkpOlxcL1xcLyhbXFwtXFx3XStcXC4pK1xcd3syLDN9KFxcL1slXFwtXFx3XSsoXFwuXFx3ezIsfSk/KSooKFtcXHdcXC1cXC5cXD9cXFxcXFwvK0AmIztgfj0lIV0qKShcXC5cXHd7Mix9KT8pKlxcLz8pL2kudGVzdCh2YWx1ZSk7Y2FzZVwiaXBhZGRyZXNzXCI6cmV0dXJuL15cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSQvLnRlc3QodmFsdWUpfX1yZXR1cm4gdHJ1ZX19O3ZhciBoYW5kbGVycz17X29uQmx1cjpmdW5jdGlvbigpe21zLmNvbnRhaW5lci5yZW1vdmVDbGFzcyhcIm1zLWN0bi1mb2N1c1wiKTttcy5jb2xsYXBzZSgpO19oYXNGb2N1cz1mYWxzZTtpZihtcy5nZXRSYXdWYWx1ZSgpIT09XCJcIiYmY2ZnLmFsbG93RnJlZUVudHJpZXM9PT10cnVlKXt2YXIgb2JqPXt9O29ialtjZmcuZGlzcGxheUZpZWxkXT1vYmpbY2ZnLnZhbHVlRmllbGRdPW1zLmdldFJhd1ZhbHVlKCkudHJpbSgpO21zLmFkZFRvU2VsZWN0aW9uKG9iail9c2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7aWYobXMuaXNWYWxpZCgpPT09ZmFsc2Upe21zLmNvbnRhaW5lci5hZGRDbGFzcyhjZmcuaW52YWxpZENscyl9ZWxzZSBpZihtcy5pbnB1dC52YWwoKSE9PVwiXCImJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09ZmFsc2Upe21zLmVtcHR5KCk7c2VsZi5fdXBkYXRlSGVscGVyKFwiXCIpfSQobXMpLnRyaWdnZXIoXCJibHVyXCIsW21zXSl9LF9vbkNvbWJvSXRlbU1vdXNlT3ZlcjpmdW5jdGlvbihlKXt2YXIgdGFyZ2V0PSQoZS5jdXJyZW50VGFyZ2V0KTtpZighdGFyZ2V0Lmhhc0NsYXNzKFwibXMtcmVzLWl0ZW0tZGlzYWJsZWRcIikpe21zLmNvbWJvYm94LmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3MoXCJtcy1yZXMtaXRlbS1hY3RpdmVcIik7dGFyZ2V0LmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpfX0sX29uQ29tYm9JdGVtU2VsZWN0ZWQ6ZnVuY3Rpb24oZSl7dmFyIHRhcmdldD0kKGUuY3VycmVudFRhcmdldCk7aWYoIXRhcmdldC5oYXNDbGFzcyhcIm1zLXJlcy1pdGVtLWRpc2FibGVkXCIpKXtzZWxmLl9zZWxlY3RJdGVtKCQoZS5jdXJyZW50VGFyZ2V0KSl9fSxfb25Gb2N1czpmdW5jdGlvbigpe21zLmlucHV0LmZvY3VzKCl9LF9vbklucHV0Q2xpY2s6ZnVuY3Rpb24oKXtpZihtcy5pc0Rpc2FibGVkKCk9PT1mYWxzZSYmX2hhc0ZvY3VzKXtpZihjZmcudG9nZ2xlT25DbGljaz09PXRydWUpe2lmKGNmZy5leHBhbmRlZCl7bXMuY29sbGFwc2UoKX1lbHNle21zLmV4cGFuZCgpfX19fSxfb25JbnB1dEZvY3VzOmZ1bmN0aW9uKCl7aWYobXMuaXNEaXNhYmxlZCgpPT09ZmFsc2UmJiFfaGFzRm9jdXMpe19oYXNGb2N1cz10cnVlO21zLmNvbnRhaW5lci5hZGRDbGFzcyhcIm1zLWN0bi1mb2N1c1wiKTttcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpO3ZhciBjdXJMZW5ndGg9bXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7aWYoY2ZnLmV4cGFuZE9uRm9jdXM9PT10cnVlKXttcy5leHBhbmQoKX1pZihfc2VsZWN0aW9uLmxlbmd0aD09PWNmZy5tYXhTZWxlY3Rpb24pe3NlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLF9zZWxlY3Rpb24ubGVuZ3RoKSl9ZWxzZSBpZihjdXJMZW5ndGg8Y2ZnLm1pbkNoYXJzKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLGNmZy5taW5DaGFycy1jdXJMZW5ndGgpKX1zZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTskKG1zKS50cmlnZ2VyKFwiZm9jdXNcIixbbXNdKX19LF9vbktleURvd246ZnVuY3Rpb24oZSl7dmFyIGFjdGl2ZT1tcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdFwiKSxmcmVlSW5wdXQ9bXMuaW5wdXQudmFsKCk7JChtcykudHJpZ2dlcihcImtleWRvd25cIixbbXMsZV0pO2lmKGUua2V5Q29kZT09PUtFWUNPREVTLlRBQiYmKGNmZy51c2VUYWJLZXk9PT1mYWxzZXx8Y2ZnLnVzZVRhYktleT09PXRydWUmJmFjdGl2ZS5sZW5ndGg9PT0wJiZtcy5pbnB1dC52YWwoKS5sZW5ndGg9PT0wKSl7aGFuZGxlcnMuX29uQmx1cigpO3JldHVybn1zd2l0Y2goZS5rZXlDb2RlKXtjYXNlIEtFWUNPREVTLkJBQ0tTUEFDRTppZihmcmVlSW5wdXQubGVuZ3RoPT09MCYmbXMuZ2V0U2VsZWN0aW9uKCkubGVuZ3RoPjAmJmNmZy5zZWxlY3Rpb25Qb3NpdGlvbj09PVwiaW5uZXJcIil7X3NlbGVjdGlvbi5wb3AoKTtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTskKG1zKS50cmlnZ2VyKFwic2VsZWN0aW9uY2hhbmdlXCIsW21zLG1zLmdldFNlbGVjdGlvbigpXSk7bXMuaW5wdXQuYXR0cihcInBsYWNlaG9sZGVyXCIsY2ZnLnNlbGVjdGlvblBvc2l0aW9uPT09XCJpbm5lclwiJiZtcy5nZXRWYWx1ZSgpLmxlbmd0aD4wP1wiXCI6Y2ZnLnBsYWNlaG9sZGVyKTttcy5pbnB1dC5mb2N1cygpO2UucHJldmVudERlZmF1bHQoKX1icmVhaztjYXNlIEtFWUNPREVTLlRBQjpjYXNlIEtFWUNPREVTLkVTQzplLnByZXZlbnREZWZhdWx0KCk7YnJlYWs7Y2FzZSBLRVlDT0RFUy5FTlRFUjppZihmcmVlSW5wdXQhPT1cIlwifHxjZmcuZXhwYW5kZWQpe2UucHJldmVudERlZmF1bHQoKX1icmVhaztjYXNlIEtFWUNPREVTLkNPTU1BOmlmKGNmZy51c2VDb21tYUtleT09PXRydWUpe2UucHJldmVudERlZmF1bHQoKX1icmVhaztjYXNlIEtFWUNPREVTLkNUUkw6X2N0cmxEb3duPXRydWU7YnJlYWs7Y2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6ZS5wcmV2ZW50RGVmYXVsdCgpO3NlbGYuX21vdmVTZWxlY3RlZFJvdyhcImRvd25cIik7YnJlYWs7Y2FzZSBLRVlDT0RFUy5VUEFSUk9XOmUucHJldmVudERlZmF1bHQoKTtzZWxmLl9tb3ZlU2VsZWN0ZWRSb3coXCJ1cFwiKTticmVhaztkZWZhdWx0OmlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7ZS5wcmV2ZW50RGVmYXVsdCgpfWJyZWFrfX0sX29uS2V5VXA6ZnVuY3Rpb24oZSl7dmFyIGZyZWVJbnB1dD1tcy5nZXRSYXdWYWx1ZSgpLGlucHV0VmFsaWQ9JC50cmltKG1zLmlucHV0LnZhbCgpKS5sZW5ndGg+MCYmKCFjZmcubWF4RW50cnlMZW5ndGh8fCQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoPD1jZmcubWF4RW50cnlMZW5ndGgpLHNlbGVjdGVkLG9iaj17fTskKG1zKS50cmlnZ2VyKFwia2V5dXBcIixbbXMsZV0pO2NsZWFyVGltZW91dChfdGltZXIpO2lmKGUua2V5Q29kZT09PUtFWUNPREVTLkVTQyYmY2ZnLmV4cGFuZGVkKXttcy5jb21ib2JveC5oaWRlKCl9aWYoZS5rZXlDb2RlPT09S0VZQ09ERVMuVEFCJiZjZmcudXNlVGFiS2V5PT09ZmFsc2V8fGUua2V5Q29kZT5LRVlDT0RFUy5FTlRFUiYmZS5rZXlDb2RlPEtFWUNPREVTLlNQQUNFKXtpZihlLmtleUNvZGU9PT1LRVlDT0RFUy5DVFJMKXtfY3RybERvd249ZmFsc2V9cmV0dXJufXN3aXRjaChlLmtleUNvZGUpe2Nhc2UgS0VZQ09ERVMuVVBBUlJPVzpjYXNlIEtFWUNPREVTLkRPV05BUlJPVzplLnByZXZlbnREZWZhdWx0KCk7YnJlYWs7Y2FzZSBLRVlDT0RFUy5FTlRFUjpjYXNlIEtFWUNPREVTLlRBQjpjYXNlIEtFWUNPREVTLkNPTU1BOmlmKGUua2V5Q29kZSE9PUtFWUNPREVTLkNPTU1BfHxjZmcudXNlQ29tbWFLZXk9PT10cnVlKXtlLnByZXZlbnREZWZhdWx0KCk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7c2VsZWN0ZWQ9bXMuY29tYm9ib3guZmluZChcIi5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3RcIik7aWYoc2VsZWN0ZWQubGVuZ3RoPjApe3NlbGYuX3NlbGVjdEl0ZW0oc2VsZWN0ZWQpO3JldHVybn19aWYoaW5wdXRWYWxpZD09PXRydWUmJmNmZy5hbGxvd0ZyZWVFbnRyaWVzPT09dHJ1ZSl7b2JqW2NmZy5kaXNwbGF5RmllbGRdPW9ialtjZmcudmFsdWVGaWVsZF09ZnJlZUlucHV0LnRyaW0oKTttcy5hZGRUb1NlbGVjdGlvbihvYmopO21zLmNvbGxhcHNlKCk7bXMuaW5wdXQuZm9jdXMoKX1icmVha31kZWZhdWx0OmlmKF9zZWxlY3Rpb24ubGVuZ3RoPT09Y2ZnLm1heFNlbGVjdGlvbil7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsX3NlbGVjdGlvbi5sZW5ndGgpKX1lbHNle2lmKGZyZWVJbnB1dC5sZW5ndGg8Y2ZnLm1pbkNoYXJzKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1pbkNoYXJzUmVuZGVyZXIuY2FsbCh0aGlzLGNmZy5taW5DaGFycy1mcmVlSW5wdXQubGVuZ3RoKSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7bXMuY29sbGFwc2UoKX19ZWxzZSBpZihjZmcubWF4RW50cnlMZW5ndGgmJmZyZWVJbnB1dC5sZW5ndGg+Y2ZnLm1heEVudHJ5TGVuZ3RoKXtzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heEVudHJ5UmVuZGVyZXIuY2FsbCh0aGlzLGZyZWVJbnB1dC5sZW5ndGgtY2ZnLm1heEVudHJ5TGVuZ3RoKSk7aWYoY2ZnLmV4cGFuZGVkPT09dHJ1ZSl7bXMuY29sbGFwc2UoKX19ZWxzZXttcy5oZWxwZXIuaGlkZSgpO2lmKGNmZy5taW5DaGFyczw9ZnJlZUlucHV0Lmxlbmd0aCl7X3RpbWVyPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtpZihjZmcuZXhwYW5kZWQ9PT10cnVlKXtzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKX1lbHNle21zLmV4cGFuZCgpfX0sY2ZnLnR5cGVEZWxheSl9fX1icmVha319LF9vblRhZ1RyaWdnZXJDbGljazpmdW5jdGlvbihlKXttcy5yZW1vdmVGcm9tU2VsZWN0aW9uKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKFwianNvblwiKSl9LF9vblRyaWdnZXJDbGljazpmdW5jdGlvbigpe2lmKG1zLmlzRGlzYWJsZWQoKT09PWZhbHNlJiYhKGNmZy5leHBhbmRPbkZvY3VzPT09dHJ1ZSYmX3NlbGVjdGlvbi5sZW5ndGg9PT1jZmcubWF4U2VsZWN0aW9uKSl7JChtcykudHJpZ2dlcihcInRyaWdnZXJjbGlja1wiLFttc10pO2lmKGNmZy5leHBhbmRlZD09PXRydWUpe21zLmNvbGxhcHNlKCl9ZWxzZXt2YXIgY3VyTGVuZ3RoPW1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO2lmKGN1ckxlbmd0aD49Y2ZnLm1pbkNoYXJzKXttcy5pbnB1dC5mb2N1cygpO21zLmV4cGFuZCgpfWVsc2V7c2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcyxjZmcubWluQ2hhcnMtY3VyTGVuZ3RoKSl9fX19LF9vbldpbmRvd1Jlc2l6ZWQ6ZnVuY3Rpb24oKXtzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKX19O2lmKGVsZW1lbnQhPT1udWxsKXtzZWxmLl9yZW5kZXIoZWxlbWVudCl9fTskLmZuLm1hZ2ljU3VnZ2VzdD1mdW5jdGlvbihvcHRpb25zKXt2YXIgb2JqPSQodGhpcyk7aWYob2JqLnNpemUoKT09PTEmJm9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpKXtyZXR1cm4gb2JqLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIil9b2JqLmVhY2goZnVuY3Rpb24oaSl7dmFyIGNudHI9JCh0aGlzKTtpZihjbnRyLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIikpe3JldHVybn1pZih0aGlzLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk9PT1cInNlbGVjdFwiKXtvcHRpb25zLmRhdGE9W107b3B0aW9ucy52YWx1ZT1bXTskLmVhY2godGhpcy5jaGlsZHJlbixmdW5jdGlvbihpbmRleCxjaGlsZCl7aWYoY2hpbGQubm9kZU5hbWUmJmNoaWxkLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk9PT1cIm9wdGlvblwiKXtvcHRpb25zLmRhdGEucHVzaCh7aWQ6Y2hpbGQudmFsdWUsbmFtZTpjaGlsZC50ZXh0fSk7aWYoJChjaGlsZCkuYXR0cihcInNlbGVjdGVkXCIpKXtvcHRpb25zLnZhbHVlLnB1c2goY2hpbGQudmFsdWUpfX19KX12YXIgZGVmPXt9OyQuZWFjaCh0aGlzLmF0dHJpYnV0ZXMsZnVuY3Rpb24oaSxhdHQpe2RlZlthdHQubmFtZV09YXR0Lm5hbWU9PT1cInZhbHVlXCImJmF0dC52YWx1ZSE9PVwiXCI/SlNPTi5wYXJzZShhdHQudmFsdWUpOmF0dC52YWx1ZX0pO3ZhciBmaWVsZD1uZXcgTWFnaWNTdWdnZXN0KHRoaXMsJC5leHRlbmQoW10sJC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHMsb3B0aW9ucyxkZWYpKTtjbnRyLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIixmaWVsZCk7ZmllbGQuY29udGFpbmVyLmRhdGEoXCJtYWdpY1N1Z2dlc3RcIixmaWVsZCl9KTtpZihvYmouc2l6ZSgpPT09MSl7cmV0dXJuIG9iai5kYXRhKFwibWFnaWNTdWdnZXN0XCIpfXJldHVybiBvYmp9OyQuZm4ubWFnaWNTdWdnZXN0LmRlZmF1bHRzPXt9fSkoalF1ZXJ5KTsiLCIvKipcclxuICogTXVsdGlwbGUgU2VsZWN0aW9uIENvbXBvbmVudCBmb3IgQm9vdHN0cmFwXHJcbiAqIENoZWNrIG5pY29sYXNiaXplLmdpdGh1Yi5pby9tYWdpY3N1Z2dlc3QvIGZvciBsYXRlc3QgdXBkYXRlcy5cclxuICpcclxuICogQXV0aG9yOiAgICAgICBOaWNvbGFzIEJpemVcclxuICogQ3JlYXRlZDogICAgICBGZWIgOHRoIDIwMTNcclxuICogTGFzdCBVcGRhdGVkOiBPY3QgMTZ0aCAyMDE0XHJcbiAqIFZlcnNpb246ICAgICAgMi4xLjRcclxuICogTGljZW5jZTogICAgICBNYWdpY1N1Z2dlc3QgaXMgbGljZW5jZWQgdW5kZXIgTUlUIGxpY2VuY2UgKGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQpXHJcbiAqL1xyXG4oZnVuY3Rpb24oJClcclxue1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICB2YXIgTWFnaWNTdWdnZXN0ID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucylcclxuICAgIHtcclxuICAgICAgICB2YXIgbXMgPSB0aGlzO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBJbml0aWFsaXplcyB0aGUgTWFnaWNTdWdnZXN0IGNvbXBvbmVudFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcclxuICAgICAgICAgICAgLyoqKioqKioqKiogIENPTkZJR1VSQVRJT04gUFJPUEVSVElFUyAqKioqKioqKioqKiovXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZXN0cmljdHMgb3IgYWxsb3dzIHRoZSB1c2VyIHRvIHZhbGlkYXRlIHR5cGVkIGVudHJpZXMuXHJcbiAgICAgICAgICAgICAqIERlZmF1bHRzIHRvIHRydWUuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBhbGxvd0ZyZWVFbnRyaWVzOiB0cnVlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJlc3RyaWN0cyBvciBhbGxvd3MgdGhlIHVzZXIgdG8gYWRkIHRoZSBzYW1lIGVudHJ5IG1vcmUgdGhhbiBvbmNlXHJcbiAgICAgICAgICAgICAqIERlZmF1bHRzIHRvIGZhbHNlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgYWxsb3dEdXBsaWNhdGVzOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIGNvbmZpZyBvYmplY3QgcGFzc2VkIHRvIGVhY2ggJC5hamF4IGNhbGxcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGFqYXhDb25maWc6IHt9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIElmIGEgc2luZ2xlIHN1Z2dlc3Rpb24gY29tZXMgb3V0LCBpdCBpcyBwcmVzZWxlY3RlZC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGF1dG9TZWxlY3Q6IHRydWUsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQXV0byBzZWxlY3QgdGhlIGZpcnN0IG1hdGNoaW5nIGl0ZW0gd2l0aCBtdWx0aXBsZSBpdGVtcyBzaG93blxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc2VsZWN0Rmlyc3Q6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEFsbG93IGN1c3RvbWl6YXRpb24gb2YgcXVlcnkgcGFyYW1ldGVyXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBxdWVyeVBhcmFtOiAncXVlcnknLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdHJpZ2dlcmVkIGp1c3QgYmVmb3JlIHRoZSBhamF4IHJlcXVlc3QgaXMgc2VudCwgc2ltaWxhciB0byBqUXVlcnlcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCl7IH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBjdXN0b20gQ1NTIGNsYXNzIHRvIGFwcGx5IHRvIHRoZSBmaWVsZCdzIHVuZGVybHlpbmcgZWxlbWVudC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGNsczogJycsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSlNPTiBEYXRhIHNvdXJjZSB1c2VkIHRvIHBvcHVsYXRlIHRoZSBjb21ibyBib3guIDMgb3B0aW9ucyBhcmUgYXZhaWxhYmxlIGhlcmU6XHJcbiAgICAgICAgICAgICAqIE5vIERhdGEgU291cmNlIChkZWZhdWx0KVxyXG4gICAgICAgICAgICAgKiAgICBXaGVuIGxlZnQgbnVsbCwgdGhlIGNvbWJvIGJveCB3aWxsIG5vdCBzdWdnZXN0IGFueXRoaW5nLiBJdCBjYW4gc3RpbGwgZW5hYmxlIHRoZSB1c2VyIHRvIGVudGVyXHJcbiAgICAgICAgICAgICAqICAgIG11bHRpcGxlIGVudHJpZXMgaWYgYWxsb3dGcmVlRW50cmllcyBpcyAqIHNldCB0byB0cnVlIChkZWZhdWx0KS5cclxuICAgICAgICAgICAgICogU3RhdGljIFNvdXJjZVxyXG4gICAgICAgICAgICAgKiAgICBZb3UgY2FuIHBhc3MgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzLCBhbiBhcnJheSBvZiBzdHJpbmdzIG9yIGV2ZW4gYSBzaW5nbGUgQ1NWIHN0cmluZyBhcyB0aGVcclxuICAgICAgICAgICAgICogICAgZGF0YSBzb3VyY2UuRm9yIGV4LiBkYXRhOiBbKiB7aWQ6MCxuYW1lOlwiUGFyaXNcIn0sIHtpZDogMSwgbmFtZTogXCJOZXcgWW9ya1wifV1cclxuICAgICAgICAgICAgICogICAgWW91IGNhbiBhbHNvIHBhc3MgYW55IGpzb24gb2JqZWN0IHdpdGggdGhlIHJlc3VsdHMgcHJvcGVydHkgY29udGFpbmluZyB0aGUganNvbiBhcnJheS5cclxuICAgICAgICAgICAgICogVXJsXHJcbiAgICAgICAgICAgICAqICAgICBZb3UgY2FuIHBhc3MgdGhlIHVybCBmcm9tIHdoaWNoIHRoZSBjb21wb25lbnQgd2lsbCBmZXRjaCBpdHMgSlNPTiBkYXRhLkRhdGEgd2lsbCBiZSBmZXRjaGVkXHJcbiAgICAgICAgICAgICAqICAgICB1c2luZyBhIFBPU1QgYWpheCByZXF1ZXN0IHRoYXQgd2lsbCAqIGluY2x1ZGUgdGhlIGVudGVyZWQgdGV4dCBhcyAncXVlcnknIHBhcmFtZXRlci4gVGhlIHJlc3VsdHNcclxuICAgICAgICAgICAgICogICAgIGZldGNoZWQgZnJvbSB0aGUgc2VydmVyIGNhbiBiZTpcclxuICAgICAgICAgICAgICogICAgIC0gYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzIChleDogW3tpZDouLi4sbmFtZTouLi59LHsuLi59XSlcclxuICAgICAgICAgICAgICogICAgIC0gYSBzdHJpbmcgY29udGFpbmluZyBhbiBhcnJheSBvZiBKU09OIG9iamVjdHMgcmVhZHkgdG8gYmUgcGFyc2VkIChleDogXCJbe2lkOi4uLixuYW1lOi4uLn0sey4uLn1dXCIpXHJcbiAgICAgICAgICAgICAqICAgICAtIGEgSlNPTiBvYmplY3Qgd2hvc2UgZGF0YSB3aWxsIGJlIGNvbnRhaW5lZCBpbiB0aGUgcmVzdWx0cyBwcm9wZXJ0eVxyXG4gICAgICAgICAgICAgKiAgICAgIChleDoge3Jlc3VsdHM6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV1cclxuICAgICAgICAgICAgICogRnVuY3Rpb25cclxuICAgICAgICAgICAgICogICAgIFlvdSBjYW4gcGFzcyBhIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW4gYXJyYXkgb2YgSlNPTiBvYmplY3RzICAoZXg6IFt7aWQ6Li4uLG5hbWU6Li4ufSx7Li4ufV0pXHJcbiAgICAgICAgICAgICAqICAgICBUaGUgZnVuY3Rpb24gY2FuIHJldHVybiB0aGUgSlNPTiBkYXRhIG9yIGl0IGNhbiB1c2UgdGhlIGZpcnN0IGFyZ3VtZW50IGFzIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgZGF0YS5cclxuICAgICAgICAgICAgICogICAgIE9ubHkgb25lIChjYWxsYmFjayBmdW5jdGlvbiBvciByZXR1cm4gdmFsdWUpIGlzIG5lZWRlZCBmb3IgdGhlIGZ1bmN0aW9uIHRvIHN1Y2NlZWQuXHJcbiAgICAgICAgICAgICAqICAgICBTZWUgdGhlIGZvbGxvd2luZyBleGFtcGxlOlxyXG4gICAgICAgICAgICAgKiAgICAgZnVuY3Rpb24gKHJlc3BvbnNlKSB7IHZhciBteWpzb24gPSBbe25hbWU6ICd0ZXN0JywgaWQ6IDF9XTsgcmVzcG9uc2UobXlqc29uKTsgcmV0dXJuIG15anNvbjsgfVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgdG8gdGhlIGFqYXggY2FsbFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZGF0YVVybFBhcmFtczoge30sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU3RhcnQgdGhlIGNvbXBvbmVudCBpbiBhIGRpc2FibGVkIHN0YXRlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIE5hbWUgb2YgSlNPTiBvYmplY3QgcHJvcGVydHkgdGhhdCBkZWZpbmVzIHRoZSBkaXNhYmxlZCBiZWhhdmlvdXJcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGRpc2FibGVkRmllbGQ6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSBkaXNwbGF5ZWQgaW4gdGhlIGNvbWJvIGxpc3RcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGRpc3BsYXlGaWVsZDogJ25hbWUnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNldCB0byBmYWxzZSBpZiB5b3Ugb25seSB3YW50IG1vdXNlIGludGVyYWN0aW9uLiBJbiB0aGF0IGNhc2UgdGhlIGNvbWJvIHdpbGxcclxuICAgICAgICAgICAgICogYXV0b21hdGljYWxseSBleHBhbmQgb24gZm9jdXMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBlZGl0YWJsZTogdHJ1ZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZXQgc3RhcnRpbmcgc3RhdGUgZm9yIGNvbWJvLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZXhwYW5kZWQ6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEF1dG9tYXRpY2FsbHkgZXhwYW5kcyBjb21ibyBvbiBmb2N1cy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGV4cGFuZE9uRm9jdXM6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEpTT04gcHJvcGVydHkgYnkgd2hpY2ggdGhlIGxpc3Qgc2hvdWxkIGJlIGdyb3VwZWRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGdyb3VwQnk6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogU2V0IHRvIHRydWUgdG8gaGlkZSB0aGUgdHJpZ2dlciBvbiB0aGUgcmlnaHRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGhpZGVUcmlnZ2VyOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBoaWdobGlnaHQgc2VhcmNoIGlucHV0IHdpdGhpbiBkaXNwbGF5ZWQgc3VnZ2VzdGlvbnNcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGN1c3RvbSBJRCBmb3IgdGhpcyBjb21wb25lbnRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlkOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgY2xhc3MgdGhhdCBpcyBhZGRlZCB0byB0aGUgaW5mbyBtZXNzYWdlIGFwcGVhcmluZyBvbiB0aGUgdG9wLXJpZ2h0IHBhcnQgb2YgdGhlIGNvbXBvbmVudFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaW5mb01zZ0NsczogJycsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHBhc3NlZCBvdXQgdG8gdGhlIElOUFVUIHRhZy4gRW5hYmxlcyB1c2FnZSBvZiBBbmd1bGFySlMncyBjdXN0b20gdGFncyBmb3IgZXguXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpbnB1dENmZzoge30sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIGNsYXNzIHRoYXQgaXMgYXBwbGllZCB0byBzaG93IHRoYXQgdGhlIGZpZWxkIGlzIGludmFsaWRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGludmFsaWRDbHM6ICdtcy1pbnYnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIGZpbHRlciBkYXRhIHJlc3VsdHMgYWNjb3JkaW5nIHRvIGNhc2UuIFVzZWxlc3MgaWYgdGhlIGRhdGEgaXMgZmV0Y2hlZCByZW1vdGVseVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWF0Y2hDYXNlOiBmYWxzZSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBPbmNlIGV4cGFuZGVkLCB0aGUgY29tYm8ncyBoZWlnaHQgd2lsbCB0YWtlIGFzIG11Y2ggcm9vbSBhcyB0aGUgIyBvZiBhdmFpbGFibGUgcmVzdWx0cy5cclxuICAgICAgICAgICAgICogICAgSW4gY2FzZSB0aGVyZSBhcmUgdG9vIG1hbnkgcmVzdWx0cyBkaXNwbGF5ZWQsIHRoaXMgd2lsbCBmaXggdGhlIGRyb3AgZG93biBoZWlnaHQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtYXhEcm9wSGVpZ2h0OiAyOTAsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogRGVmaW5lcyBob3cgbG9uZyB0aGUgdXNlciBmcmVlIGVudHJ5IGNhbiBiZS4gU2V0IHRvIG51bGwgZm9yIG5vIGxpbWl0LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWF4RW50cnlMZW5ndGg6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gdGhlIG1heCBlbnRyeSBsZW5ndGggaGFzIGJlZW4gc3VycGFzc2VkLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWF4RW50cnlSZW5kZXJlcjogZnVuY3Rpb24odikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdQbGVhc2UgcmVkdWNlIHlvdXIgZW50cnkgYnkgJyArIHYgKyAnIGNoYXJhY3RlcicgKyAodiA+IDEgPyAncyc6JycpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiByZXN1bHRzIGRpc3BsYXllZCBpbiB0aGUgY29tYm8gZHJvcCBkb3duIGF0IG9uY2UuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtYXhTdWdnZXN0aW9uczogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdGhlIHVzZXIgY2FuIHNlbGVjdCBpZiBtdWx0aXBsZSBzZWxlY3Rpb24gaXMgYWxsb3dlZC5cclxuICAgICAgICAgICAgICogICAgU2V0IHRvIG51bGwgdG8gcmVtb3ZlIHRoZSBsaW1pdC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1heFNlbGVjdGlvbjogMTAsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiB0aGF0IGRlZmluZXMgdGhlIGhlbHBlciB0ZXh0IHdoZW4gdGhlIG1heCBzZWxlY3Rpb24gYW1vdW50IGhhcyBiZWVuIHJlYWNoZWQuIFRoZSBmdW5jdGlvbiBoYXMgYSBzaW5nbGVcclxuICAgICAgICAgICAgICogICAgcGFyYW1ldGVyIHdoaWNoIGlzIHRoZSBudW1iZXIgb2Ygc2VsZWN0ZWQgZWxlbWVudHMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBtYXhTZWxlY3Rpb25SZW5kZXJlcjogZnVuY3Rpb24odikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdZb3UgY2Fubm90IGNob29zZSBtb3JlIHRoYW4gJyArIHYgKyAnIGl0ZW0nICsgKHYgPiAxID8gJ3MnOicnKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgbWV0aG9kIHVzZWQgYnkgdGhlIGFqYXggcmVxdWVzdC5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBtaW5pbXVtIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRoZSB1c2VyIG11c3QgdHlwZSBiZWZvcmUgdGhlIGNvbWJvIGV4cGFuZHMgYW5kIG9mZmVycyBzdWdnZXN0aW9ucy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIG1pbkNoYXJzOiAwLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIHRoZSBoZWxwZXIgdGV4dCB3aGVuIG5vdCBlbm91Z2ggbGV0dGVycyBhcmUgc2V0LiBUaGUgZnVuY3Rpb24gaGFzIGEgc2luZ2xlXHJcbiAgICAgICAgICAgICAqICAgIHBhcmFtZXRlciB3aGljaCBpcyB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSByZXF1aXJlZCBhbW91bnQgb2YgbGV0dGVycyBhbmQgdGhlIGN1cnJlbnQgb25lLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbWluQ2hhcnNSZW5kZXJlcjogZnVuY3Rpb24odikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdQbGVhc2UgdHlwZSAnICsgdiArICcgbW9yZSBjaGFyYWN0ZXInICsgKHYgPiAxID8gJ3MnOicnKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBXaGV0aGVyIG9yIG5vdCBzb3J0aW5nIC8gZmlsdGVyaW5nIHNob3VsZCBiZSBkb25lIHJlbW90ZWx5IG9yIGxvY2FsbHkuXHJcbiAgICAgICAgICAgICAqIFVzZSBlaXRoZXIgJ2xvY2FsJyBvciAncmVtb3RlJ1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbW9kZTogJ2xvY2FsJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgbmFtZSB1c2VkIGFzIGEgZm9ybSBlbGVtZW50LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgbmFtZTogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgdGV4dCBkaXNwbGF5ZWQgd2hlbiB0aGVyZSBhcmUgbm8gc3VnZ2VzdGlvbnMuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBub1N1Z2dlc3Rpb25UZXh0OiAnTm8gc3VnZ2VzdGlvbnMnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBkZWZhdWx0IHBsYWNlaG9sZGVyIHRleHQgd2hlbiBub3RoaW5nIGhhcyBiZWVuIGVudGVyZWRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnVHlwZSBvciBjbGljayBoZXJlJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHVzZWQgdG8gZGVmaW5lIGhvdyB0aGUgaXRlbXMgd2lsbCBiZSBwcmVzZW50ZWQgaW4gdGhlIGNvbWJvXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZW5kZXJlcjogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBXaGV0aGVyIG9yIG5vdCB0aGlzIGZpZWxkIHNob3VsZCBiZSByZXF1aXJlZFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNldCB0byB0cnVlIHRvIHJlbmRlciBzZWxlY3Rpb24gYXMgYSBkZWxpbWl0ZWQgc3RyaW5nXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICByZXN1bHRBc1N0cmluZzogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGV4dCBkZWxpbWl0ZXIgdG8gdXNlIGluIGEgZGVsaW1pdGVkIHN0cmluZy5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJlc3VsdEFzU3RyaW5nRGVsaW1pdGVyOiAnLCcsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogTmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgdGhlIGxpc3Qgb2Ygc3VnZ2VzdGVkIG9iamVjdHNcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHJlc3VsdHNGaWVsZDogJ3Jlc3VsdHMnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEEgY3VzdG9tIENTUyBjbGFzcyB0byBhZGQgdG8gYSBzZWxlY3RlZCBpdGVtXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzZWxlY3Rpb25DbHM6ICcnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEFuIG9wdGlvbmFsIGVsZW1lbnQgcmVwbGFjZW1lbnQgaW4gd2hpY2ggdGhlIHNlbGVjdGlvbiBpcyByZW5kZXJlZFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc2VsZWN0aW9uQ29udGFpbmVyOiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFdoZXJlIHRoZSBzZWxlY3RlZCBpdGVtcyB3aWxsIGJlIGRpc3BsYXllZC4gT25seSAncmlnaHQnLCAnYm90dG9tJyBhbmQgJ2lubmVyJyBhcmUgdmFsaWQgdmFsdWVzXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzZWxlY3Rpb25Qb3NpdGlvbjogJ2lubmVyJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBBIGZ1bmN0aW9uIHVzZWQgdG8gZGVmaW5lIGhvdyB0aGUgaXRlbXMgd2lsbCBiZSBwcmVzZW50ZWQgaW4gdGhlIHRhZyBsaXN0XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzZWxlY3Rpb25SZW5kZXJlcjogbnVsbCxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBTZXQgdG8gdHJ1ZSB0byBzdGFjayB0aGUgc2VsZWN0aW9uZWQgaXRlbXMgd2hlbiBwb3NpdGlvbmVkIG9uIHRoZSBib3R0b21cclxuICAgICAgICAgICAgICogICAgUmVxdWlyZXMgdGhlIHNlbGVjdGlvblBvc2l0aW9uIHRvIGJlIHNldCB0byAnYm90dG9tJ1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc2VsZWN0aW9uU3RhY2tlZDogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogRGlyZWN0aW9uIHVzZWQgZm9yIHNvcnRpbmcuIE9ubHkgJ2FzYycgYW5kICdkZXNjJyBhcmUgdmFsaWQgdmFsdWVzXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzb3J0RGlyOiAnYXNjJyxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBuYW1lIG9mIEpTT04gb2JqZWN0IHByb3BlcnR5IGZvciBsb2NhbCByZXN1bHQgc29ydGluZy5cclxuICAgICAgICAgICAgICogICAgTGVhdmUgbnVsbCBpZiB5b3UgZG8gbm90IHdpc2ggdGhlIHJlc3VsdHMgdG8gYmUgb3JkZXJlZCBvciBpZiB0aGV5IGFyZSBhbHJlYWR5IG9yZGVyZWQgcmVtb3RlbHkuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBzb3J0T3JkZXI6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHN1Z2dlc3Rpb25zIHdpbGwgaGF2ZSB0byBzdGFydCBieSB1c2VyIGlucHV0IChhbmQgbm90IHNpbXBseSBjb250YWluIGl0IGFzIGEgc3Vic3RyaW5nKVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc3RyaWN0U3VnZ2VzdDogZmFsc2UsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQ3VzdG9tIHN0eWxlIGFkZGVkIHRvIHRoZSBjb21wb25lbnQgY29udGFpbmVyLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgc3R5bGU6ICcnLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB0aGUgY29tYm8gd2lsbCBleHBhbmQgLyBjb2xsYXBzZSB3aGVuIGNsaWNrZWQgdXBvblxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdG9nZ2xlT25DbGljazogZmFsc2UsXHJcblxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEFtb3VudCAoaW4gbXMpIGJldHdlZW4ga2V5Ym9hcmQgcmVnaXN0ZXJzLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdHlwZURlbGF5OiA0MDAsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSWYgc2V0IHRvIHRydWUsIHRhYiB3b24ndCBibHVyIHRoZSBjb21wb25lbnQgYnV0IHdpbGwgYmUgcmVnaXN0ZXJlZCBhcyB0aGUgRU5URVIga2V5XHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB1c2VUYWJLZXk6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIElmIHNldCB0byB0cnVlLCB1c2luZyBjb21tYSB3aWxsIHZhbGlkYXRlIHRoZSB1c2VyJ3MgY2hvaWNlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICB1c2VDb21tYUtleTogdHJ1ZSxcclxuXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIG5vdCB0aGUgcmVzdWx0cyB3aWxsIGJlIGRpc3BsYXllZCB3aXRoIGEgemVicmEgdGFibGUgc3R5bGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHVzZVplYnJhU3R5bGU6IGZhbHNlLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIGluaXRpYWwgdmFsdWUgZm9yIHRoZSBmaWVsZFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdmFsdWU6IG51bGwsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogbmFtZSBvZiBKU09OIG9iamVjdCBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgaXRzIHVuZGVybHlpbmcgdmFsdWVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIHZhbHVlRmllbGQ6ICdpZCcsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogcmVndWxhciBleHByZXNzaW9uIHRvIHZhbGlkYXRlIHRoZSB2YWx1ZXMgYWdhaW5zdFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdnJlZ2V4OiBudWxsLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIHR5cGUgdG8gdmFsaWRhdGUgYWdhaW5zdFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdnR5cGU6IG51bGxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgY29uZiA9ICQuZXh0ZW5kKHt9LG9wdGlvbnMpO1xyXG4gICAgICAgIHZhciBjZmcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIGNvbmYpO1xyXG5cclxuICAgICAgICAvKioqKioqKioqKiAgUFVCTElDIE1FVEhPRFMgKioqKioqKioqKioqL1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFkZCBvbmUgb3IgbXVsdGlwbGUganNvbiBpdGVtcyB0byB0aGUgY3VycmVudCBzZWxlY3Rpb25cclxuICAgICAgICAgKiBAcGFyYW0gaXRlbXMgLSBqc29uIG9iamVjdCBvciBhcnJheSBvZiBqc29uIG9iamVjdHNcclxuICAgICAgICAgKiBAcGFyYW0gaXNTaWxlbnQgLSAob3B0aW9uYWwpIHNldCB0byB0cnVlIHRvIHN1cHByZXNzICdzZWxlY3Rpb25jaGFuZ2UnIGV2ZW50IGZyb20gYmVpbmcgdHJpZ2dlcmVkXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5hZGRUb1NlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zLCBpc1NpbGVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmICghY2ZnLm1heFNlbGVjdGlvbiB8fCBfc2VsZWN0aW9uLmxlbmd0aCA8IGNmZy5tYXhTZWxlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIGlmICghJC5pc0FycmF5KGl0ZW1zKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gW2l0ZW1zXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZWNoYW5nZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICQuZWFjaChpdGVtcywgZnVuY3Rpb24oaW5kZXgsIGpzb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2ZnLmFsbG93RHVwbGljYXRlcyB8fCAkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sIG1zLmdldFZhbHVlKCkpID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfc2VsZWN0aW9uLnB1c2goanNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlY2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZih2YWx1ZWNoYW5nZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVtcHR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU2lsZW50ICE9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW3RoaXMsIHRoaXMuZ2V0U2VsZWN0aW9uKCldKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5pbnB1dC5hdHRyKCdwbGFjZWhvbGRlcicsIChjZmcuc2VsZWN0aW9uUG9zaXRpb24gPT09ICdpbm5lcicgJiYgdGhpcy5nZXRWYWx1ZSgpLmxlbmd0aCA+IDApID8gJycgOiBjZmcucGxhY2Vob2xkZXIpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENsZWFycyB0aGUgY3VycmVudCBzZWxlY3Rpb25cclxuICAgICAgICAgKiBAcGFyYW0gaXNTaWxlbnQgLSAob3B0aW9uYWwpIHNldCB0byB0cnVlIHRvIHN1cHByZXNzICdzZWxlY3Rpb25jaGFuZ2UnIGV2ZW50IGZyb20gYmVpbmcgdHJpZ2dlcmVkXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5jbGVhciA9IGZ1bmN0aW9uKGlzU2lsZW50KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5yZW1vdmVGcm9tU2VsZWN0aW9uKF9zZWxlY3Rpb24uc2xpY2UoMCksIGlzU2lsZW50KTsgLy8gY2xvbmUgYXJyYXkgdG8gYXZvaWQgY29uY3VycmVuY3kgaXNzdWVzXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ29sbGFwc2UgdGhlIGRyb3AgZG93biBwYXJ0IG9mIHRoZSBjb21ib1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuY29sbGFwc2UgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbWJvYm94LmRldGFjaCgpO1xyXG4gICAgICAgICAgICAgICAgY2ZnLmV4cGFuZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ2NvbGxhcHNlJywgW3RoaXNdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCB0aGUgY29tcG9uZW50IGluIGEgZGlzYWJsZWQgc3RhdGUuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5kaXNhYmxlID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuYWRkQ2xhc3MoJ21zLWN0bi1kaXNhYmxlZCcpO1xyXG4gICAgICAgICAgICBjZmcuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBtcy5pbnB1dC5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVtcHRpZXMgb3V0IHRoZSBjb21ibyB1c2VyIHRleHRcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmVtcHR5ID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dC52YWwoJycpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCB0aGUgY29tcG9uZW50IGluIGEgZW5hYmxlIHN0YXRlLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZW5hYmxlID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ21zLWN0bi1kaXNhYmxlZCcpO1xyXG4gICAgICAgICAgICBjZmcuZGlzYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgbXMuaW5wdXQuYXR0cignZGlzYWJsZWQnLCBmYWxzZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRXhwYW5kIHRoZSBkcm9wIGRyb3duIHBhcnQgb2YgdGhlIGNvbWJvLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZXhwYW5kID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYgKCFjZmcuZXhwYW5kZWQgJiYgKHRoaXMuaW5wdXQudmFsKCkubGVuZ3RoID49IGNmZy5taW5DaGFycyB8fCB0aGlzLmNvbWJvYm94LmNoaWxkcmVuKCkuc2l6ZSgpID4gMCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29tYm9ib3guYXBwZW5kVG8odGhpcy5jb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgICAgICAgICBjZmcuZXhwYW5kZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCdleHBhbmQnLCBbdGhpc10pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmUgY29tcG9uZW50IGVuYWJsZWQgc3RhdHVzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5pc0Rpc2FibGVkID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNmZy5kaXNhYmxlZDtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZmllbGQgaXMgdmFsaWQgb3Igbm90XHJcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn1cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmlzVmFsaWQgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgdmFsaWQgPSBjZmcucmVxdWlyZWQgPT09IGZhbHNlIHx8IF9zZWxlY3Rpb24ubGVuZ3RoID4gMDtcclxuICAgICAgICAgICAgaWYoY2ZnLnZ0eXBlIHx8IGNmZy52cmVnZXgpe1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKF9zZWxlY3Rpb24sIGZ1bmN0aW9uKGluZGV4LCBpdGVtKXtcclxuICAgICAgICAgICAgICAgICAgICB2YWxpZCA9IHZhbGlkICYmIHNlbGYuX3ZhbGlkYXRlU2luZ2xlSXRlbShpdGVtW2NmZy52YWx1ZUZpZWxkXSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsaWQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogR2V0cyB0aGUgZGF0YSBwYXJhbXMgZm9yIGN1cnJlbnQgYWpheCByZXF1ZXN0XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5nZXREYXRhVXJsUGFyYW1zID0gZnVuY3Rpb24oKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNmZy5kYXRhVXJsUGFyYW1zO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEdldHMgdGhlIG5hbWUgZ2l2ZW4gdG8gdGhlIGZvcm0gaW5wdXRcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmdldE5hbWUgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gY2ZnLm5hbWU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmV0cmlldmUgYW4gYXJyYXkgb2Ygc2VsZWN0ZWQganNvbiBvYmplY3RzXHJcbiAgICAgICAgICogQHJldHVybiB7QXJyYXl9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5nZXRTZWxlY3Rpb24gPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gX3NlbGVjdGlvbjtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZXRyaWV2ZSB0aGUgY3VycmVudCB0ZXh0IGVudGVyZWQgYnkgdGhlIHVzZXJcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmdldFJhd1ZhbHVlID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgcmV0dXJuIG1zLmlucHV0LnZhbCgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJldHJpZXZlIGFuIGFycmF5IG9mIHNlbGVjdGVkIHZhbHVlc1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZ2V0VmFsdWUgPSBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gJC5tYXAoX3NlbGVjdGlvbiwgZnVuY3Rpb24obykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9bY2ZnLnZhbHVlRmllbGRdO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZW1vdmUgb25lIG9yIG11bHRpcGxlcyBqc29uIGl0ZW1zIGZyb20gdGhlIGN1cnJlbnQgc2VsZWN0aW9uXHJcbiAgICAgICAgICogQHBhcmFtIGl0ZW1zIC0ganNvbiBvYmplY3Qgb3IgYXJyYXkgb2YganNvbiBvYmplY3RzXHJcbiAgICAgICAgICogQHBhcmFtIGlzU2lsZW50IC0gKG9wdGlvbmFsKSBzZXQgdG8gdHJ1ZSB0byBzdXBwcmVzcyAnc2VsZWN0aW9uY2hhbmdlJyBldmVudCBmcm9tIGJlaW5nIHRyaWdnZXJlZFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMucmVtb3ZlRnJvbVNlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zLCBpc1NpbGVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmICghJC5pc0FycmF5KGl0ZW1zKSkge1xyXG4gICAgICAgICAgICAgICAgaXRlbXMgPSBbaXRlbXNdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZWNoYW5nZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgJC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpbmRleCwganNvbikge1xyXG4gICAgICAgICAgICAgICAgdmFyIGkgPSAkLmluQXJyYXkoanNvbltjZmcudmFsdWVGaWVsZF0sIG1zLmdldFZhbHVlKCkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPiAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9zZWxlY3Rpb24uc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlY2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAodmFsdWVjaGFuZ2VkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIGlmKGlzU2lsZW50ICE9PSB0cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3NlbGVjdGlvbmNoYW5nZScsIFt0aGlzLCB0aGlzLmdldFNlbGVjdGlvbigpXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmlucHV0LmF0dHIoJ3BsYWNlaG9sZGVyJywgKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiB0aGlzLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogR2V0IGN1cnJlbnQgZGF0YVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHJldHVybiBfY2JEYXRhO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldCB1cCBzb21lIGNvbWJvIGRhdGEgYWZ0ZXIgaXQgaGFzIGJlZW4gcmVuZGVyZWRcclxuICAgICAgICAgKiBAcGFyYW0gZGF0YVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgICAgICAgICBjZmcuZGF0YSA9IGRhdGE7XHJcbiAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucygpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldHMgdGhlIG5hbWUgZm9yIHRoZSBpbnB1dCBmaWVsZCBzbyBpdCBjYW4gYmUgZmV0Y2hlZCBpbiB0aGUgZm9ybVxyXG4gICAgICAgICAqIEBwYXJhbSBuYW1lXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5zZXROYW1lID0gZnVuY3Rpb24obmFtZSl7XHJcbiAgICAgICAgICAgIGNmZy5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgaWYobmFtZSl7XHJcbiAgICAgICAgICAgICAgICBjZmcubmFtZSArPSBuYW1lLmluZGV4T2YoJ1tdJykgPiAwID8gJycgOiAnW10nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKG1zLl92YWx1ZUNvbnRhaW5lcil7XHJcbiAgICAgICAgICAgICAgICAkLmVhY2gobXMuX3ZhbHVlQ29udGFpbmVyLmNoaWxkcmVuKCksIGZ1bmN0aW9uKGksIGVsKXtcclxuICAgICAgICAgICAgICAgICAgICBlbC5uYW1lID0gY2ZnLm5hbWU7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldHMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uIHdpdGggdGhlIEpTT04gaXRlbXMgcHJvdmlkZWRcclxuICAgICAgICAgKiBAcGFyYW0gaXRlbXNcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnNldFNlbGVjdGlvbiA9IGZ1bmN0aW9uKGl0ZW1zKXtcclxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTZXRzIGEgdmFsdWUgZm9yIHRoZSBjb21ibyBib3guIFZhbHVlIG11c3QgYmUgYW4gYXJyYXkgb2YgdmFsdWVzIHdpdGggZGF0YSB0eXBlIG1hdGNoaW5nIHZhbHVlRmllbGQgb25lLlxyXG4gICAgICAgICAqIEBwYXJhbSBkYXRhXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5zZXRWYWx1ZSA9IGZ1bmN0aW9uKHZhbHVlcylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtcyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgJC5lYWNoKHZhbHVlcywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBmaXJzdCB0cnkgdG8gc2VlIGlmIHdlIGhhdmUgdGhlIGZ1bGwgb2JqZWN0cyBmcm9tIG91ciBkYXRhIHNldFxyXG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAkLmVhY2goX2NiRGF0YSwgZnVuY3Rpb24oaSxpdGVtKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihpdGVtW2NmZy52YWx1ZUZpZWxkXSA9PSB2YWx1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYoIWZvdW5kKXtcclxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YodmFsdWUpID09PSAnb2JqZWN0Jyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2godmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bY2ZnLnZhbHVlRmllbGRdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bY2ZnLmRpc3BsYXlGaWVsZF0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZihpdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFRvU2VsZWN0aW9uKGl0ZW1zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFNldHMgZGF0YSBwYXJhbXMgZm9yIHN1YnNlcXVlbnQgYWpheCByZXF1ZXN0c1xyXG4gICAgICAgICAqIEBwYXJhbSBwYXJhbXNcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnNldERhdGFVcmxQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjZmcuZGF0YVVybFBhcmFtcyA9ICQuZXh0ZW5kKHt9LHBhcmFtcyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqKioqKioqKiogIFBSSVZBVEUgKioqKioqKioqKioqL1xyXG4gICAgICAgIHZhciBfc2VsZWN0aW9uID0gW10sICAgICAgLy8gc2VsZWN0ZWQgb2JqZWN0c1xyXG4gICAgICAgICAgICBfY29tYm9JdGVtSGVpZ2h0ID0gMCwgLy8gaGVpZ2h0IGZvciBlYWNoIGNvbWJvIGl0ZW0uXHJcbiAgICAgICAgICAgIF90aW1lcixcclxuICAgICAgICAgICAgX2hhc0ZvY3VzID0gZmFsc2UsXHJcbiAgICAgICAgICAgIF9ncm91cHMgPSBudWxsLFxyXG4gICAgICAgICAgICBfY2JEYXRhID0gW10sXHJcbiAgICAgICAgICAgIF9jdHJsRG93biA9IGZhbHNlLFxyXG4gICAgICAgICAgICBLRVlDT0RFUyA9IHtcclxuICAgICAgICAgICAgICAgIEJBQ0tTUEFDRTogOCxcclxuICAgICAgICAgICAgICAgIFRBQjogOSxcclxuICAgICAgICAgICAgICAgIEVOVEVSOiAxMyxcclxuICAgICAgICAgICAgICAgIENUUkw6IDE3LFxyXG4gICAgICAgICAgICAgICAgRVNDOiAyNyxcclxuICAgICAgICAgICAgICAgIFNQQUNFOiAzMixcclxuICAgICAgICAgICAgICAgIFVQQVJST1c6IDM4LFxyXG4gICAgICAgICAgICAgICAgRE9XTkFSUk9XOiA0MCxcclxuICAgICAgICAgICAgICAgIENPTU1BOiAxODhcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHNlbGYgPSB7XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogRW1wdGllcyB0aGUgcmVzdWx0IGNvbnRhaW5lciBhbmQgcmVmaWxscyBpdCB3aXRoIHRoZSBhcnJheSBvZiBqc29uIHJlc3VsdHMgaW4gaW5wdXRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9kaXNwbGF5U3VnZ2VzdGlvbnM6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNob3coKTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmVtcHR5KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHJlc0hlaWdodCA9IDAsIC8vIHRvdGFsIGhlaWdodCB0YWtlbiBieSBkaXNwbGF5ZWQgcmVzdWx0cy5cclxuICAgICAgICAgICAgICAgICAgICBuYkdyb3VwcyA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoX2dyb3VwcyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlckNvbWJvSXRlbXMoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzSGVpZ2h0ID0gX2NvbWJvSXRlbUhlaWdodCAqIGRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBncnBOYW1lIGluIF9ncm91cHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmJHcm91cHMgKz0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXJlcy1ncm91cCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBncnBOYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmFwcGVuZFRvKG1zLmNvbWJvYm94KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyQ29tYm9JdGVtcyhfZ3JvdXBzW2dycE5hbWVdLml0ZW1zLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9ncm91cEl0ZW1IZWlnaHQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWdyb3VwJykub3V0ZXJIZWlnaHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZihfZ3JvdXBJdGVtSGVpZ2h0ICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdG1wUmVzSGVpZ2h0ID0gbmJHcm91cHMgKiBfZ3JvdXBJdGVtSGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzSGVpZ2h0ID0gKF9jb21ib0l0ZW1IZWlnaHQgKiBkYXRhLmxlbmd0aCkgKyB0bXBSZXNIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlc0hlaWdodCA9IF9jb21ib0l0ZW1IZWlnaHQgKiAoZGF0YS5sZW5ndGggKyBuYkdyb3Vwcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKHJlc0hlaWdodCA8IG1zLmNvbWJvYm94LmhlaWdodCgpIHx8IHJlc0hlaWdodCA8PSBjZmcubWF4RHJvcEhlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhlaWdodChyZXNIZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZihyZXNIZWlnaHQgPj0gbXMuY29tYm9ib3guaGVpZ2h0KCkgJiYgcmVzSGVpZ2h0ID4gY2ZnLm1heERyb3BIZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oZWlnaHQoY2ZnLm1heERyb3BIZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAxICYmIGNmZy5hdXRvU2VsZWN0ID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guY2hpbGRyZW4oKS5maWx0ZXIoJzpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpsYXN0JykuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChjZmcuc2VsZWN0Rmlyc3QgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5jaGlsZHJlbigpLmZpbHRlcignOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpOmZpcnN0JykuYWRkQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwICYmIG1zLmdldFJhd1ZhbHVlKCkgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbm9TdWdnZXN0aW9uVGV4dCA9IGNmZy5ub1N1Z2dlc3Rpb25UZXh0LnJlcGxhY2UoL1xce1xcey4qXFx9XFx9LywgbXMuaW5wdXQudmFsKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihub1N1Z2dlc3Rpb25UZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdoZW4gZnJlZSBlbnRyeSBpcyBvZmYsIGFkZCBpbnZhbGlkIGNsYXNzIHRvIGlucHV0IGlmIG5vIGRhdGEgbWF0Y2hlc1xyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAkKG1zLmlucHV0KS5hZGRDbGFzcyhjZmcuaW52YWxpZENscyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5oaWRlKCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJChtcy5pbnB1dCkucmVtb3ZlQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogUmV0dXJucyBhbiBhcnJheSBvZiBqc29uIG9iamVjdHMgZnJvbSBhbiBhcnJheSBvZiBzdHJpbmdzLlxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX2dldEVudHJpZXNGcm9tU3RyaW5nQXJyYXk6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHZhciBqc29uID0gW107XHJcbiAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIHMpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZW50cnkgPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICBlbnRyeVtjZmcuZGlzcGxheUZpZWxkXSA9IGVudHJ5W2NmZy52YWx1ZUZpZWxkXSA9ICQudHJpbShzKTtcclxuICAgICAgICAgICAgICAgICAgICBqc29uLnB1c2goZW50cnkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ganNvbjtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZXBsYWNlcyBodG1sIHdpdGggaGlnaGxpZ2h0ZWQgaHRtbCBhY2NvcmRpbmcgdG8gY2FzZVxyXG4gICAgICAgICAgICAgKiBAcGFyYW0gaHRtbFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX2hpZ2hsaWdodFN1Z2dlc3Rpb246IGZ1bmN0aW9uKGh0bWwpIHtcclxuICAgICAgICAgICAgICAgIHZhciBxID0gbXMuaW5wdXQudmFsKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9lc2NhcGUgc3BlY2lhbCByZWdleCBjaGFyYWN0ZXJzXHJcbiAgICAgICAgICAgICAgICB2YXIgc3BlY2lhbENoYXJhY3RlcnMgPSBbJ14nLCAnJCcsICcqJywgJysnLCAnPycsICcuJywgJygnLCAnKScsICc6JywgJyEnLCAnfCcsICd7JywgJ30nLCAnWycsICddJ107XHJcblxyXG4gICAgICAgICAgICAgICAgJC5lYWNoKHNwZWNpYWxDaGFyYWN0ZXJzLCBmdW5jdGlvbiAoaW5kZXgsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcSA9IHEucmVwbGFjZSh2YWx1ZSwgXCJcXFxcXCIgKyB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKHEubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGh0bWw7IC8vIG5vdGhpbmcgZW50ZXJlZCBhcyBpbnB1dFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhciBnbG9iID0gY2ZnLm1hdGNoQ2FzZSA9PT0gdHJ1ZSA/ICdnJyA6ICdnaSc7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaHRtbC5yZXBsYWNlKG5ldyBSZWdFeHAoJygnICsgcSArICcpKD8hKFtePF0rKT8+KScsIGdsb2IpLCAnPGVtPiQxPC9lbT4nKTtcclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBNb3ZlcyB0aGUgc2VsZWN0ZWQgY3Vyc29yIGFtb25nc3QgdGhlIGxpc3QgaXRlbVxyXG4gICAgICAgICAgICAgKiBAcGFyYW0gZGlyIC0gJ3VwJyBvciAnZG93bidcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9tb3ZlU2VsZWN0ZWRSb3c6IGZ1bmN0aW9uKGRpcikge1xyXG4gICAgICAgICAgICAgICAgaWYoIWNmZy5leHBhbmRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIGxpc3QsIHN0YXJ0LCBhY3RpdmUsIHNjcm9sbFBvcztcclxuICAgICAgICAgICAgICAgIGxpc3QgPSBtcy5jb21ib2JveC5maW5kKFwiLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpXCIpO1xyXG4gICAgICAgICAgICAgICAgaWYoZGlyID09PSAnZG93bicpIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZXEoMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZmlsdGVyKCc6bGFzdCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYWN0aXZlID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpO1xyXG4gICAgICAgICAgICAgICAgaWYoYWN0aXZlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihkaXIgPT09ICdkb3duJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGFjdGl2ZS5uZXh0QWxsKCcubXMtcmVzLWl0ZW06bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCknKS5maXJzdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbGlzdC5lcSgwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxQb3MgPSBtcy5jb21ib2JveC5zY3JvbGxUb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihzdGFydFswXS5vZmZzZXRUb3AgKyBzdGFydC5vdXRlckhlaWdodCgpID4gbXMuY29tYm9ib3guaGVpZ2h0KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcChzY3JvbGxQb3MgKyBfY29tYm9JdGVtSGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBhY3RpdmUucHJldkFsbCgnLm1zLXJlcy1pdGVtOm5vdCgubXMtcmVzLWl0ZW0tZGlzYWJsZWQpJykuZmlyc3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGxpc3QuZmlsdGVyKCc6bGFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29tYm9ib3guc2Nyb2xsVG9wKF9jb21ib0l0ZW1IZWlnaHQgKiBsaXN0Lmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhcnRbMF0ub2Zmc2V0VG9wIDwgbXMuY29tYm9ib3guc2Nyb2xsVG9wKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LnNjcm9sbFRvcChtcy5jb21ib2JveC5zY3JvbGxUb3AoKSAtIF9jb21ib0l0ZW1IZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGlzdC5yZW1vdmVDbGFzcyhcIm1zLXJlcy1pdGVtLWFjdGl2ZVwiKTtcclxuICAgICAgICAgICAgICAgIHN0YXJ0LmFkZENsYXNzKFwibXMtcmVzLWl0ZW0tYWN0aXZlXCIpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEFjY29yZGluZyB0byBnaXZlbiBkYXRhIGFuZCBxdWVyeSwgc29ydCBhbmQgYWRkIHN1Z2dlc3Rpb25zIGluIHRoZWlyIGNvbnRhaW5lclxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3Byb2Nlc3NTdWdnZXN0aW9uczogZnVuY3Rpb24oc291cmNlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIganNvbiA9IG51bGwsIGRhdGEgPSBzb3VyY2UgfHwgY2ZnLmRhdGE7XHJcbiAgICAgICAgICAgICAgICBpZihkYXRhICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodHlwZW9mKGRhdGEpID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGRhdGEuY2FsbChtcywgbXMuZ2V0UmF3VmFsdWUoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKHR5cGVvZihkYXRhKSA9PT0gJ3N0cmluZycpIHsgLy8gZ2V0IHJlc3VsdHMgZnJvbSBhamF4XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2JlZm9yZWxvYWQnLCBbbXNdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge31cclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlQYXJhbXNbY2ZnLnF1ZXJ5UGFyYW1dID0gbXMuaW5wdXQudmFsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSAkLmV4dGVuZChxdWVyeVBhcmFtcywgY2ZnLmRhdGFVcmxQYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkLmFqYXgoJC5leHRlbmQoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY2ZnLm1ldGhvZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZVNlbmQ6IGNmZy5iZWZvcmVTZW5kLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oYXN5bmNEYXRhKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uID0gdHlwZW9mKGFzeW5jRGF0YSkgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShhc3luY0RhdGEpIDogYXN5bmNEYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb2Nlc3NTdWdnZXN0aW9ucyhqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdsb2FkJywgW21zLCBqc29uXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VsZi5fYXN5bmNWYWx1ZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZXRWYWx1ZSh0eXBlb2Yoc2VsZi5fYXN5bmNWYWx1ZXMpID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2Uoc2VsZi5fYXN5bmNWYWx1ZXMpIDogc2VsZi5fYXN5bmNWYWx1ZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlKHNlbGYuX2FzeW5jVmFsdWVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3coXCJDb3VsZCBub3QgcmVhY2ggc2VydmVyXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBjZmcuYWpheENvbmZpZykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVzdWx0cyBmcm9tIGxvY2FsIGFycmF5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID4gMCAmJiB0eXBlb2YoZGF0YVswXSkgPT09ICdzdHJpbmcnKSB7IC8vIHJlc3VsdHMgZnJvbSBhcnJheSBvZiBzdHJpbmdzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfY2JEYXRhID0gc2VsZi5fZ2V0RW50cmllc0Zyb21TdHJpbmdBcnJheShkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gcmVndWxhciBqc29uIGFycmF5IG9yIGpzb24gb2JqZWN0IHdpdGggcmVzdWx0cyBwcm9wZXJ0eVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2NiRGF0YSA9IGRhdGFbY2ZnLnJlc3VsdHNGaWVsZF0gfHwgZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB2YXIgc29ydGVkRGF0YSA9IGNmZy5tb2RlID09PSAncmVtb3RlJyA/IF9jYkRhdGEgOiBzZWxmLl9zb3J0QW5kVHJpbShfY2JEYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9kaXNwbGF5U3VnZ2VzdGlvbnMoc2VsZi5fZ3JvdXAoc29ydGVkRGF0YSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZW5kZXIgdGhlIGNvbXBvbmVudCB0byB0aGUgZ2l2ZW4gaW5wdXQgRE9NIGVsZW1lbnRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9yZW5kZXI6IGZ1bmN0aW9uKGVsKSB7XHJcbiAgICAgICAgICAgICAgICBtcy5zZXROYW1lKGNmZy5uYW1lKTsgIC8vIG1ha2Ugc3VyZSB0aGUgZm9ybSBuYW1lIGlzIGNvcnJlY3RcclxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBtYWluIGRpdiwgd2lsbCByZWxheSB0aGUgZm9jdXMgZXZlbnRzIHRvIHRoZSBjb250YWluZWQgaW5wdXQgZWxlbWVudC5cclxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lciA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY3RuIGZvcm0tY29udHJvbCAnICsgKGNmZy5yZXN1bHRBc1N0cmluZyA/ICdtcy1hcy1zdHJpbmcgJyA6ICcnKSArIGNmZy5jbHMgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoJChlbCkuaGFzQ2xhc3MoJ2lucHV0LWxnJykgPyAnIGlucHV0LWxnJyA6ICcnKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICgkKGVsKS5oYXNDbGFzcygnaW5wdXQtc20nKSA/ICcgaW5wdXQtc20nIDogJycpICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGNmZy5kaXNhYmxlZCA9PT0gdHJ1ZSA/ICcgbXMtY3RuLWRpc2FibGVkJyA6ICcnKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChjZmcuZWRpdGFibGUgPT09IHRydWUgPyAnJyA6ICcgbXMtY3RuLXJlYWRvbmx5JykgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLmhpZGVUcmlnZ2VyID09PSBmYWxzZSA/ICcnIDogJyBtcy1uby10cmlnZ2VyJyksXHJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IGNmZy5zdHlsZSxcclxuICAgICAgICAgICAgICAgICAgICBpZDogY2ZnLmlkXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLCB0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYmx1cigkLnByb3h5KGhhbmRsZXJzLl9vbkJsdXIsIHRoaXMpKTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5rZXlkb3duKCQucHJveHkoaGFuZGxlcnMuX29uS2V5RG93biwgdGhpcykpO1xyXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmtleXVwKCQucHJveHkoaGFuZGxlcnMuX29uS2V5VXAsIHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgaW5wdXQgZmllbGRcclxuICAgICAgICAgICAgICAgIG1zLmlucHV0ID0gJCgnPGlucHV0Lz4nLCAkLmV4dGVuZCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6IGNmZy5lZGl0YWJsZSA9PT0gdHJ1ZSA/ICcnIDogJyBtcy1pbnB1dC1yZWFkb25seScsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZG9ubHk6ICFjZmcuZWRpdGFibGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNmZy5wbGFjZWhvbGRlcixcclxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY2ZnLmRpc2FibGVkXHJcbiAgICAgICAgICAgICAgICB9LCBjZmcuaW5wdXRDZmcpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygkLnByb3h5KGhhbmRsZXJzLl9vbklucHV0Rm9jdXMsIHRoaXMpKTtcclxuICAgICAgICAgICAgICAgIG1zLmlucHV0LmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uSW5wdXRDbGljaywgdGhpcykpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGhvbGRzIHRoZSBzdWdnZXN0aW9ucy4gd2lsbCBhbHdheXMgYmUgcGxhY2VkIG9uIGZvY3VzXHJcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveCA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtcmVzLWN0biBkcm9wZG93bi1tZW51J1xyXG4gICAgICAgICAgICAgICAgfSkuaGVpZ2h0KGNmZy5tYXhEcm9wSGVpZ2h0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBiaW5kIHRoZSBvbmNsaWNrIGFuZCBtb3VzZW92ZXIgdXNpbmcgZGVsZWdhdGVkIGV2ZW50cyAobmVlZHMgalF1ZXJ5ID49IDEuNylcclxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94Lm9uKCdjbGljaycsICdkaXYubXMtcmVzLWl0ZW0nLCAkLnByb3h5KGhhbmRsZXJzLl9vbkNvbWJvSXRlbVNlbGVjdGVkLCB0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICBtcy5jb21ib2JveC5vbignbW91c2VvdmVyJywgJ2Rpdi5tcy1yZXMtaXRlbScsICQucHJveHkoaGFuZGxlcnMuX29uQ29tYm9JdGVtTW91c2VPdmVyLCB0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcil7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcjtcclxuICAgICAgICAgICAgICAgICAgICAkKG1zLnNlbGVjdGlvbkNvbnRhaW5lcikuYWRkQ2xhc3MoJ21zLXNlbC1jdG4nKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtc2VsLWN0bidcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5jbGljaygkLnByb3h5KGhhbmRsZXJzLl9vbkZvY3VzLCB0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmICFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLmFwcGVuZChtcy5pbnB1dCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYXBwZW5kKG1zLmlucHV0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBtcy5oZWxwZXIgPSAkKCc8c3Bhbi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1oZWxwZXIgJyArIGNmZy5pbmZvTXNnQ2xzXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcigpO1xyXG4gICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5oZWxwZXIpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHdob2xlIHRoaW5nXHJcbiAgICAgICAgICAgICAgICAkKGVsKS5yZXBsYWNlV2l0aChtcy5jb250YWluZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKCFjZmcuc2VsZWN0aW9uQ29udGFpbmVyKXtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2goY2ZnLnNlbGVjdGlvblBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2JvdHRvbSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25TdGFja2VkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuc2VsZWN0aW9uQ29udGFpbmVyLndpZHRoKG1zLmNvbnRhaW5lci53aWR0aCgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuYWRkQ2xhc3MoJ21zLXN0YWNrZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyaWdodCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuaW5zZXJ0QWZ0ZXIobXMuY29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5jc3MoJ2Zsb2F0JywgJ2xlZnQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy5zZWxlY3Rpb25Db250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBob2xkcyB0aGUgdHJpZ2dlciBvbiB0aGUgcmlnaHQgc2lkZVxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmhpZGVUcmlnZ2VyID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLnRyaWdnZXIgPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy10cmlnZ2VyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogJzxkaXYgY2xhc3M9XCJtcy10cmlnZ2VyLWljb1wiPjwvZGl2PidcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBtcy50cmlnZ2VyLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVHJpZ2dlckNsaWNrLCB0aGlzKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmFwcGVuZChtcy50cmlnZ2VyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkKHdpbmRvdykucmVzaXplKCQucHJveHkoaGFuZGxlcnMuX29uV2luZG93UmVzaXplZCwgdGhpcykpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGRvIG5vdCBwZXJmb3JtIGFuIGluaXRpYWwgY2FsbCBpZiB3ZSBhcmUgdXNpbmcgYWpheCB1bmxlc3Mgd2UgaGF2ZSBpbml0aWFsIHZhbHVlc1xyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnZhbHVlICE9PSBudWxsIHx8IGNmZy5kYXRhICE9PSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YoY2ZnLmRhdGEpID09PSAnc3RyaW5nJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2FzeW5jVmFsdWVzID0gY2ZnLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnZhbHVlICE9PSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLnNldFZhbHVlKGNmZy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9yZW5kZXJTZWxlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgJChcImJvZHlcIikuY2xpY2soZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKG1zLmNvbnRhaW5lci5oYXNDbGFzcygnbXMtY3RuLWZvY3VzJykgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLmhhcyhlLnRhcmdldCkubGVuZ3RoID09PSAwICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKCdtcy1yZXMtaXRlbScpIDwgMCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbXMtY2xvc2UtYnRuJykgPCAwICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lclswXSAhPT0gZS50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuX29uQmx1cigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNmZy5leHBhbmRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJlbmRlcnMgZWFjaCBlbGVtZW50IHdpdGhpbiB0aGUgY29tYm8gYm94XHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfcmVuZGVyQ29tYm9JdGVtczogZnVuY3Rpb24oaXRlbXMsIGlzR3JvdXBlZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJlZiA9IHRoaXMsIGh0bWwgPSAnJztcclxuICAgICAgICAgICAgICAgICQuZWFjaChpdGVtcywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpc3BsYXllZCA9IGNmZy5yZW5kZXJlciAhPT0gbnVsbCA/IGNmZy5yZW5kZXJlci5jYWxsKHJlZiwgdmFsdWUpIDogdmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF07XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpc2FibGVkID0gY2ZnLmRpc2FibGVkRmllbGQgIT09IG51bGwgJiYgdmFsdWVbY2ZnLmRpc2FibGVkRmllbGRdID09PSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHRJdGVtRWwgPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1yZXMtaXRlbSAnICsgKGlzR3JvdXBlZCA/ICdtcy1yZXMtaXRlbS1ncm91cGVkICc6JycpICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkaXNhYmxlZCA/ICdtcy1yZXMtaXRlbS1kaXNhYmxlZCAnOicnKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoaW5kZXggJSAyID09PSAxICYmIGNmZy51c2VaZWJyYVN0eWxlID09PSB0cnVlID8gJ21zLXJlcy1vZGQnIDogJycpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBjZmcuaGlnaGxpZ2h0ID09PSB0cnVlID8gc2VsZi5faGlnaGxpZ2h0U3VnZ2VzdGlvbihkaXNwbGF5ZWQpIDogZGlzcGxheWVkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAnZGF0YS1qc29uJzogSlNPTi5zdHJpbmdpZnkodmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAkKCc8ZGl2Lz4nKS5hcHBlbmQocmVzdWx0SXRlbUVsKS5odG1sKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmFwcGVuZChodG1sKTtcclxuICAgICAgICAgICAgICAgIF9jb21ib0l0ZW1IZWlnaHQgPSBtcy5jb21ib2JveC5maW5kKCcubXMtcmVzLWl0ZW06Zmlyc3QnKS5vdXRlckhlaWdodCgpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJlbmRlcnMgdGhlIHNlbGVjdGVkIGl0ZW1zIGludG8gdGhlaXIgY29udGFpbmVyLlxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3JlbmRlclNlbGVjdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmVmID0gdGhpcywgdyA9IDAsIGlucHV0T2Zmc2V0ID0gMCwgaXRlbXMgPSBbXSxcclxuICAgICAgICAgICAgICAgICAgICBhc1RleHQgPSBjZmcucmVzdWx0QXNTdHJpbmcgPT09IHRydWUgJiYgIV9oYXNGb2N1cztcclxuXHJcbiAgICAgICAgICAgICAgICBtcy5zZWxlY3Rpb25Db250YWluZXIuZmluZCgnLm1zLXNlbC1pdGVtJykucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICBpZihtcy5fdmFsdWVDb250YWluZXIgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLl92YWx1ZUNvbnRhaW5lci5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkLmVhY2goX3NlbGVjdGlvbiwgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKXtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkSXRlbUVsLCBkZWxJdGVtRWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbUh0bWwgPSBjZmcuc2VsZWN0aW9uUmVuZGVyZXIgIT09IG51bGwgPyBjZmcuc2VsZWN0aW9uUmVuZGVyZXIuY2FsbChyZWYsIHZhbHVlKSA6IHZhbHVlW2NmZy5kaXNwbGF5RmllbGRdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsaWRDbHMgPSBzZWxmLl92YWxpZGF0ZVNpbmdsZUl0ZW0odmFsdWVbY2ZnLmRpc3BsYXlGaWVsZF0pID8gJycgOiAnIG1zLXNlbC1pbnZhbGlkJztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGFnIHJlcHJlc2VudGluZyBzZWxlY3RlZCB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFzVGV4dCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEl0ZW1FbCA9ICQoJzxkaXYvPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjbGFzcyc6ICdtcy1zZWwtaXRlbSBtcy1zZWwtdGV4dCAnICsgY2ZnLnNlbGVjdGlvbkNscyArIHZhbGlkQ2xzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogc2VsZWN0ZWRJdGVtSHRtbCArIChpbmRleCA9PT0gKF9zZWxlY3Rpb24ubGVuZ3RoIC0gMSkgPyAnJyA6IGNmZy5yZXN1bHRBc1N0cmluZ0RlbGltaXRlcilcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZGF0YSgnanNvbicsIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkSXRlbUVsID0gJCgnPGRpdi8+Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NsYXNzJzogJ21zLXNlbC1pdGVtICcgKyBjZmcuc2VsZWN0aW9uQ2xzICsgdmFsaWRDbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBzZWxlY3RlZEl0ZW1IdG1sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmRhdGEoJ2pzb24nLCB2YWx1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZGlzYWJsZWQgPT09IGZhbHNlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNtYWxsIGNyb3NzIGltZ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsSXRlbUVsID0gJCgnPHNwYW4vPicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2xhc3MnOiAnbXMtY2xvc2UtYnRuJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuZGF0YSgnanNvbicsIHZhbHVlKS5hcHBlbmRUbyhzZWxlY3RlZEl0ZW1FbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsSXRlbUVsLmNsaWNrKCQucHJveHkoaGFuZGxlcnMuX29uVGFnVHJpZ2dlckNsaWNrLCByZWYpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbXMucHVzaChzZWxlY3RlZEl0ZW1FbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5wcmVwZW5kKGl0ZW1zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBzdG9yZSB0aGUgdmFsdWVzLCBiZWhhdmlvdXIgb2YgbXVsdGlwbGUgc2VsZWN0XHJcbiAgICAgICAgICAgICAgICBtcy5fdmFsdWVDb250YWluZXIgPSAkKCc8ZGl2Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6ICdkaXNwbGF5OiBub25lOydcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgJC5lYWNoKG1zLmdldFZhbHVlKCksIGZ1bmN0aW9uKGksIHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsID0gJCgnPGlucHV0Lz4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdoaWRkZW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjZmcubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZFRvKG1zLl92YWx1ZUNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIG1zLl92YWx1ZUNvbnRhaW5lci5hcHBlbmRUbyhtcy5zZWxlY3Rpb25Db250YWluZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJyAmJiAhY2ZnLnNlbGVjdGlvbkNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmlucHV0LndpZHRoKDApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0T2Zmc2V0ID0gbXMuaW5wdXQub2Zmc2V0KCkubGVmdCAtIG1zLnNlbGVjdGlvbkNvbnRhaW5lci5vZmZzZXQoKS5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgIHcgPSBtcy5jb250YWluZXIud2lkdGgoKSAtIGlucHV0T2Zmc2V0IC0gNDI7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQud2lkdGgodyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWF4U2VsZWN0aW9uUmVuZGVyZXIuY2FsbCh0aGlzLCBfc2VsZWN0aW9uLmxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNlbGVjdCBhbiBpdGVtIGVpdGhlciB0aHJvdWdoIGtleWJvYXJkIG9yIG1vdXNlXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBpdGVtXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfc2VsZWN0SXRlbTogZnVuY3Rpb24oaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLm1heFNlbGVjdGlvbiA9PT0gMSl7XHJcbiAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbiA9IFtdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24oaXRlbS5kYXRhKCdqc29uJykpO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5yZW1vdmVDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XHJcbiAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kT25Gb2N1cyA9PT0gZmFsc2UgfHwgX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighX2hhc0ZvY3VzKXtcclxuICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmKF9oYXNGb2N1cyAmJiAoY2ZnLmV4cGFuZE9uRm9jdXMgfHwgX2N0cmxEb3duKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcHJvY2Vzc1N1Z2dlc3Rpb25zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoX2N0cmxEb3duKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFNvcnRzIHRoZSByZXN1bHRzIGFuZCBjdXQgdGhlbSBkb3duIHRvIG1heCAjIG9mIGRpc3BsYXllZCByZXN1bHRzIGF0IG9uY2VcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9zb3J0QW5kVHJpbTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHEgPSBtcy5nZXRSYXdWYWx1ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gW10sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3U3VnZ2VzdGlvbnMgPSBbXSxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZFZhbHVlcyA9IG1zLmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgdGhlIGRhdGEgYWNjb3JkaW5nIHRvIGdpdmVuIGlucHV0XHJcbiAgICAgICAgICAgICAgICBpZihxLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24oaW5kZXgsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG9ialtjZmcuZGlzcGxheUZpZWxkXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoKGNmZy5tYXRjaENhc2UgPT09IHRydWUgJiYgbmFtZS5pbmRleE9mKHEpID4gLTEpIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY2ZnLm1hdGNoQ2FzZSA9PT0gZmFsc2UgJiYgbmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YocS50b0xvd2VyQ2FzZSgpKSA+IC0xKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLnN0cmljdFN1Z2dlc3QgPT09IGZhbHNlIHx8IG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHEudG9Mb3dlckNhc2UoKSkgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZC5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkID0gZGF0YTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIHRha2Ugb3V0IHRoZSBvbmVzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gc2VsZWN0ZWRcclxuICAgICAgICAgICAgICAgICQuZWFjaChmaWx0ZXJlZCwgZnVuY3Rpb24oaW5kZXgsIG9iaikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZmcuYWxsb3dEdXBsaWNhdGVzIHx8ICQuaW5BcnJheShvYmpbY2ZnLnZhbHVlRmllbGRdLCBzZWxlY3RlZFZhbHVlcykgPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1N1Z2dlc3Rpb25zLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIHNvcnQgdGhlIGRhdGFcclxuICAgICAgICAgICAgICAgIGlmKGNmZy5zb3J0T3JkZXIgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucy5zb3J0KGZ1bmN0aW9uKGEsYikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdIDwgYltjZmcuc29ydE9yZGVyXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNmZy5zb3J0RGlyID09PSAnYXNjJyA/IC0xIDogMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhW2NmZy5zb3J0T3JkZXJdID4gYltjZmcuc29ydE9yZGVyXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNmZy5zb3J0RGlyID09PSAnYXNjJyA/IDEgOiAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIHRyaW0gaXQgZG93blxyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLm1heFN1Z2dlc3Rpb25zICYmIGNmZy5tYXhTdWdnZXN0aW9ucyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXdTdWdnZXN0aW9ucyA9IG5ld1N1Z2dlc3Rpb25zLnNsaWNlKDAsIGNmZy5tYXhTdWdnZXN0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3U3VnZ2VzdGlvbnM7XHJcblxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgX2dyb3VwOiBmdW5jdGlvbihkYXRhKXtcclxuICAgICAgICAgICAgICAgIC8vIGJ1aWxkIGdyb3Vwc1xyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLmdyb3VwQnkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JvdXBzID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BzID0gY2ZnLmdyb3VwQnkuaW5kZXhPZignLicpID4gLTEgPyBjZmcuZ3JvdXBCeS5zcGxpdCgnLicpIDogY2ZnLmdyb3VwQnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wID0gdmFsdWVbY2ZnLmdyb3VwQnldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0eXBlb2YocHJvcHMpICE9ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKHByb3BzLmxlbmd0aCA+IDApe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3AgPSBwcm9wW3Byb3BzLnNoaWZ0KCldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKF9ncm91cHNbcHJvcF0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2dyb3Vwc1twcm9wXSA9IHt0aXRsZTogcHJvcCwgaXRlbXM6IFt2YWx1ZV19O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2dyb3Vwc1twcm9wXS5pdGVtcy5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVXBkYXRlIHRoZSBoZWxwZXIgdGV4dFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3VwZGF0ZUhlbHBlcjogZnVuY3Rpb24oaHRtbCkge1xyXG4gICAgICAgICAgICAgICAgbXMuaGVscGVyLmh0bWwoaHRtbCk7XHJcbiAgICAgICAgICAgICAgICBpZighbXMuaGVscGVyLmlzKFwiOnZpc2libGVcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5oZWxwZXIuZmFkZUluKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVmFsaWRhdGUgYW4gaXRlbSBhZ2FpbnN0IHZ0eXBlIG9yIHZyZWdleFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX3ZhbGlkYXRlU2luZ2xlSXRlbTogZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgICAgICAgICAgaWYoY2ZnLnZyZWdleCAhPT0gbnVsbCAmJiBjZmcudnJlZ2V4IGluc3RhbmNlb2YgUmVnRXhwKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2ZnLnZyZWdleC50ZXN0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihjZmcudnR5cGUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2goY2ZnLnZ0eXBlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWxwaGEnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eW2EtekEtWl9dKyQvKS50ZXN0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWxwaGFudW0nOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eW2EtekEtWjAtOV9dKyQvKS50ZXN0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZW1haWwnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eKFxcdyspKFtcXC0rLl1bXFx3XSspKkAoXFx3W1xcLVxcd10qXFwuKXsxLDV9KFtBLVphLXpdKXsyLDZ9JC8pLnRlc3QodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd1cmwnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC8oKCheaHR0cHM/KXwoXmZ0cCkpOlxcL1xcLyhbXFwtXFx3XStcXC4pK1xcd3syLDN9KFxcL1slXFwtXFx3XSsoXFwuXFx3ezIsfSk/KSooKFtcXHdcXC1cXC5cXD9cXFxcXFwvK0AmIztgfj0lIV0qKShcXC5cXHd7Mix9KT8pKlxcLz8pL2kpLnRlc3QodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdpcGFkZHJlc3MnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC9eXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30kLykudGVzdCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgaGFuZGxlcnMgPSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBibHVycmluZyBvdXQgb2YgdGhlIGNvbXBvbmVudFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uQmx1cjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBtcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoJ21zLWN0bi1mb2N1cycpO1xyXG4gICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcclxuICAgICAgICAgICAgICAgIF9oYXNGb2N1cyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYobXMuZ2V0UmF3VmFsdWUoKSAhPT0gJycgJiYgY2ZnLmFsbG93RnJlZUVudHJpZXMgPT09IHRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICBvYmpbY2ZnLmRpc3BsYXlGaWVsZF0gPSBvYmpbY2ZnLnZhbHVlRmllbGRdID0gbXMuZ2V0UmF3VmFsdWUoKS50cmltKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuYWRkVG9TZWxlY3Rpb24ob2JqKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKG1zLmlzVmFsaWQoKSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBtcy5jb250YWluZXIuYWRkQ2xhc3MoY2ZnLmludmFsaWRDbHMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYobXMuaW5wdXQudmFsKCkgIT09ICcnICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmVtcHR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKCcnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCdibHVyJywgW21zXSk7XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gaG92ZXJpbmcgYW4gZWxlbWVudCBpbiB0aGUgY29tYm9cclxuICAgICAgICAgICAgICogQHBhcmFtIGVcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbkNvbWJvSXRlbU1vdXNlT3ZlcjogZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIGlmKCF0YXJnZXQuaGFzQ2xhc3MoJ21zLXJlcy1pdGVtLWRpc2FibGVkJykpe1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3MoJ21zLXJlcy1pdGVtLWFjdGl2ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5hZGRDbGFzcygnbXMtcmVzLWl0ZW0tYWN0aXZlJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gYW4gaXRlbSBpcyBjaG9zZW4gZnJvbSB0aGUgbGlzdFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uQ29tYm9JdGVtU2VsZWN0ZWQ6IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICBpZighdGFyZ2V0Lmhhc0NsYXNzKCdtcy1yZXMtaXRlbS1kaXNhYmxlZCcpKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9zZWxlY3RJdGVtKCQoZS5jdXJyZW50VGFyZ2V0KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gZm9jdXNpbmcgb24gdGhlIGNvbnRhaW5lciBkaXYuIFdpbGwgZm9jdXMgb24gdGhlIGlucHV0IGZpZWxkIGluc3RlYWQuXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25Gb2N1czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIG9uIHRoZSBpbnB1dCB0ZXh0IGZpZWxkXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25JbnB1dENsaWNrOiBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYgKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgX2hhc0ZvY3VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNmZy50b2dnbGVPbkNsaWNrID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZmcuZXhwYW5kZWQpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGZvY3VzaW5nIG9uIHRoZSBpbnB1dCB0ZXh0IGZpZWxkLlxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uSW5wdXRGb2N1czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZihtcy5pc0Rpc2FibGVkKCkgPT09IGZhbHNlICYmICFfaGFzRm9jdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBfaGFzRm9jdXMgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbnRhaW5lci5hZGRDbGFzcygnbXMtY3RuLWZvY3VzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgbXMuY29udGFpbmVyLnJlbW92ZUNsYXNzKGNmZy5pbnZhbGlkQ2xzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckxlbmd0aCA9IG1zLmdldFJhd1ZhbHVlKCkubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRPbkZvY3VzID09PSB0cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heFNlbGVjdGlvblJlbmRlcmVyLmNhbGwodGhpcywgX3NlbGVjdGlvbi5sZW5ndGgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYoY3VyTGVuZ3RoIDwgY2ZnLm1pbkNoYXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3VwZGF0ZUhlbHBlcihjZmcubWluQ2hhcnNSZW5kZXJlci5jYWxsKHRoaXMsIGNmZy5taW5DaGFycyAtIGN1ckxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignZm9jdXMnLCBbbXNdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiB0aGUgdXNlciBwcmVzc2VzIGEga2V5IHdoaWxlIHRoZSBjb21wb25lbnQgaGFzIGZvY3VzXHJcbiAgICAgICAgICAgICAqIFRoaXMgaXMgd2hlcmUgd2Ugd2FudCB0byBoYW5kbGUgYWxsIGtleXMgdGhhdCBkb24ndCByZXF1aXJlIHRoZSB1c2VyIGlucHV0IGZpZWxkXHJcbiAgICAgICAgICAgICAqIHNpbmNlIGl0IGhhc24ndCByZWdpc3RlcmVkIHRoZSBrZXkgaGl0IHlldFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0gZSBrZXlFdmVudFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uS2V5RG93bjogZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgaG93IHRhYiBzaG91bGQgYmUgaGFuZGxlZFxyXG4gICAgICAgICAgICAgICAgdmFyIGFjdGl2ZSA9IG1zLmNvbWJvYm94LmZpbmQoJy5tcy1yZXMtaXRlbS1hY3RpdmU6bm90KC5tcy1yZXMtaXRlbS1kaXNhYmxlZCk6Zmlyc3QnKSxcclxuICAgICAgICAgICAgICAgICAgICBmcmVlSW5wdXQgPSBtcy5pbnB1dC52YWwoKTtcclxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleWRvd24nLCBbbXMsIGVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihlLmtleUNvZGUgPT09IEtFWUNPREVTLlRBQiAmJiAoY2ZnLnVzZVRhYktleSA9PT0gZmFsc2UgfHxcclxuICAgICAgICAgICAgICAgICAgICAoY2ZnLnVzZVRhYktleSA9PT0gdHJ1ZSAmJiBhY3RpdmUubGVuZ3RoID09PSAwICYmIG1zLmlucHV0LnZhbCgpLmxlbmd0aCA9PT0gMCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuX29uQmx1cigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHN3aXRjaChlLmtleUNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkJBQ0tTUEFDRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZnJlZUlucHV0Lmxlbmd0aCA9PT0gMCAmJiBtcy5nZXRTZWxlY3Rpb24oKS5sZW5ndGggPiAwICYmIGNmZy5zZWxlY3Rpb25Qb3NpdGlvbiA9PT0gJ2lubmVyJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3NlbGVjdGlvbi5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3JlbmRlclNlbGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChtcykudHJpZ2dlcignc2VsZWN0aW9uY2hhbmdlJywgW21zLCBtcy5nZXRTZWxlY3Rpb24oKV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCAoY2ZnLnNlbGVjdGlvblBvc2l0aW9uID09PSAnaW5uZXInICYmIG1zLmdldFZhbHVlKCkubGVuZ3RoID4gMCkgPyAnJyA6IGNmZy5wbGFjZWhvbGRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5pbnB1dC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRVNDOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRU5URVI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGZyZWVJbnB1dCAhPT0gJycgfHwgY2ZnLmV4cGFuZGVkKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkNPTU1BOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcudXNlQ29tbWFLZXkgPT09IHRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQ1RSTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2N0cmxEb3duID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5ET1dOQVJST1c6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbW92ZVNlbGVjdGVkUm93KFwiZG93blwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5VUEFSUk9XOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX21vdmVTZWxlY3RlZFJvdyhcInVwXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGEga2V5IGlzIHJlbGVhc2VkIHdoaWxlIHRoZSBjb21wb25lbnQgaGFzIGZvY3VzXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSBlXHJcbiAgICAgICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBfb25LZXlVcDogZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGZyZWVJbnB1dCA9IG1zLmdldFJhd1ZhbHVlKCksXHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRWYWxpZCA9ICQudHJpbShtcy5pbnB1dC52YWwoKSkubGVuZ3RoID4gMCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoIWNmZy5tYXhFbnRyeUxlbmd0aCB8fCAkLnRyaW0obXMuaW5wdXQudmFsKCkpLmxlbmd0aCA8PSBjZmcubWF4RW50cnlMZW5ndGgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLFxyXG4gICAgICAgICAgICAgICAgICAgIG9iaiA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgICQobXMpLnRyaWdnZXIoJ2tleXVwJywgW21zLCBlXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aW1lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY29sbGFwc2UgaWYgZXNjYXBlLCBidXQga2VlcCBmb2N1cy5cclxuICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuRVNDICYmIGNmZy5leHBhbmRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1zLmNvbWJvYm94LmhpZGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGlnbm9yZSBhIGJ1bmNoIG9mIGtleXNcclxuICAgICAgICAgICAgICAgIGlmKChlLmtleUNvZGUgPT09IEtFWUNPREVTLlRBQiAmJiBjZmcudXNlVGFiS2V5ID09PSBmYWxzZSkgfHwgKGUua2V5Q29kZSA+IEtFWUNPREVTLkVOVEVSICYmIGUua2V5Q29kZSA8IEtFWUNPREVTLlNQQUNFKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PT0gS0VZQ09ERVMuQ1RSTCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jdHJsRG93biA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2goZS5rZXlDb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLRVlDT0RFUy5VUEFSUk9XOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuRE9XTkFSUk9XOlxyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtFWUNPREVTLkVOVEVSOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuVEFCOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS0VZQ09ERVMuQ09NTUE6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZS5rZXlDb2RlICE9PSBLRVlDT0RFUy5DT01NQSB8fCBjZmcudXNlQ29tbWFLZXkgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpeyAvLyBpZiBhIHNlbGVjdGlvbiBpcyBwZXJmb3JtZWQsIHNlbGVjdCBpdCBhbmQgcmVzZXQgZmllbGRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkID0gbXMuY29tYm9ib3guZmluZCgnLm1zLXJlcy1pdGVtLWFjdGl2ZTpub3QoLm1zLXJlcy1pdGVtLWRpc2FibGVkKTpmaXJzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc2VsZWN0ZWQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3NlbGVjdEl0ZW0oc2VsZWN0ZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBubyBzZWxlY3Rpb24gb3IgaWYgZnJlZXRleHQgZW50ZXJlZCBhbmQgZnJlZSBlbnRyaWVzIGFsbG93ZWQsIGFkZCBuZXcgb2JqIHRvIHNlbGVjdGlvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihpbnB1dFZhbGlkID09PSB0cnVlICYmIGNmZy5hbGxvd0ZyZWVFbnRyaWVzID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbY2ZnLmRpc3BsYXlGaWVsZF0gPSBvYmpbY2ZnLnZhbHVlRmllbGRdID0gZnJlZUlucHV0LnRyaW0oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmFkZFRvU2VsZWN0aW9uKG9iaik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpOyAvLyByZXNldCBjb21ibyBzdWdnZXN0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoX3NlbGVjdGlvbi5sZW5ndGggPT09IGNmZy5tYXhTZWxlY3Rpb24pe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5tYXhTZWxlY3Rpb25SZW5kZXJlci5jYWxsKHRoaXMsIF9zZWxlY3Rpb24ubGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihmcmVlSW5wdXQubGVuZ3RoIDwgY2ZnLm1pbkNoYXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gZnJlZUlucHV0Lmxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNmZy5leHBhbmRlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtcy5jb2xsYXBzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYoY2ZnLm1heEVudHJ5TGVuZ3RoICYmIGZyZWVJbnB1dC5sZW5ndGggPiBjZmcubWF4RW50cnlMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl91cGRhdGVIZWxwZXIoY2ZnLm1heEVudHJ5UmVuZGVyZXIuY2FsbCh0aGlzLCBmcmVlSW5wdXQubGVuZ3RoIC0gY2ZnLm1heEVudHJ5TGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2ZnLmV4cGFuZGVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmNvbGxhcHNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaGVscGVyLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcubWluQ2hhcnMgPD0gZnJlZUlucHV0Lmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9jZXNzU3VnZ2VzdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuZXhwYW5kKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGNmZy50eXBlRGVsYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUcmlnZ2VyZWQgd2hlbiBjbGlja2luZyB1cG9uIGNyb3NzIGZvciBkZWxldGlvblxyXG4gICAgICAgICAgICAgKiBAcGFyYW0gZVxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uVGFnVHJpZ2dlckNsaWNrOiBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICBtcy5yZW1vdmVGcm9tU2VsZWN0aW9uKCQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCdqc29uJykpO1xyXG4gICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRyaWdnZXJlZCB3aGVuIGNsaWNraW5nIG9uIHRoZSBzbWFsbCB0cmlnZ2VyIGluIHRoZSByaWdodFxyXG4gICAgICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgX29uVHJpZ2dlckNsaWNrOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmKG1zLmlzRGlzYWJsZWQoKSA9PT0gZmFsc2UgJiYgIShjZmcuZXhwYW5kT25Gb2N1cyA9PT0gdHJ1ZSAmJiBfc2VsZWN0aW9uLmxlbmd0aCA9PT0gY2ZnLm1heFNlbGVjdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKG1zKS50cmlnZ2VyKCd0cmlnZ2VyY2xpY2snLCBbbXNdKTtcclxuICAgICAgICAgICAgICAgICAgICBpZihjZmcuZXhwYW5kZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbXMuY29sbGFwc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3VyTGVuZ3RoID0gbXMuZ2V0UmF3VmFsdWUoKS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGN1ckxlbmd0aCA+PSBjZmcubWluQ2hhcnMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXMuaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zLmV4cGFuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fdXBkYXRlSGVscGVyKGNmZy5taW5DaGFyc1JlbmRlcmVyLmNhbGwodGhpcywgY2ZnLm1pbkNoYXJzIC0gY3VyTGVuZ3RoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVHJpZ2dlcmVkIHdoZW4gdGhlIGJyb3dzZXIgd2luZG93IGlzIHJlc2l6ZWRcclxuICAgICAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIF9vbldpbmRvd1Jlc2l6ZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgc2VsZi5fcmVuZGVyU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBzdGFydHVwIHBvaW50XHJcbiAgICAgICAgaWYoZWxlbWVudCAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzZWxmLl9yZW5kZXIoZWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAkLmZuLm1hZ2ljU3VnZ2VzdCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuICAgICAgICB2YXIgb2JqID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgaWYob2JqLnNpemUoKSA9PT0gMSAmJiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0JykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iai5kYXRhKCdtYWdpY1N1Z2dlc3QnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9iai5lYWNoKGZ1bmN0aW9uKGkpIHtcclxuICAgICAgICAgICAgLy8gYXNzdW1lICQodGhpcykgaXMgYW4gZWxlbWVudFxyXG4gICAgICAgICAgICB2YXIgY250ciA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgICAgICAvLyBSZXR1cm4gZWFybHkgaWYgdGhpcyBlbGVtZW50IGFscmVhZHkgaGFzIGEgcGx1Z2luIGluc3RhbmNlXHJcbiAgICAgICAgICAgIGlmKGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0Jykpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZih0aGlzLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzZWxlY3QnKXsgLy8gcmVuZGVyaW5nIGZyb20gc2VsZWN0XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBbXTtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMudmFsdWUgPSBbXTtcclxuICAgICAgICAgICAgICAgICQuZWFjaCh0aGlzLmNoaWxkcmVuLCBmdW5jdGlvbihpbmRleCwgY2hpbGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGNoaWxkLm5vZGVOYW1lICYmIGNoaWxkLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdvcHRpb24nKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhLnB1c2goe2lkOiBjaGlsZC52YWx1ZSwgbmFtZTogY2hpbGQudGV4dH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZigkKGNoaWxkKS5hdHRyKCdzZWxlY3RlZCcpKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMudmFsdWUucHVzaChjaGlsZC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGRlZiA9IHt9O1xyXG4gICAgICAgICAgICAvLyBzZXQgdmFsdWVzIGZyb20gRE9NIGNvbnRhaW5lciBlbGVtZW50XHJcbiAgICAgICAgICAgICQuZWFjaCh0aGlzLmF0dHJpYnV0ZXMsIGZ1bmN0aW9uKGksIGF0dCl7XHJcbiAgICAgICAgICAgICAgICBkZWZbYXR0Lm5hbWVdID0gYXR0Lm5hbWUgPT09ICd2YWx1ZScgJiYgYXR0LnZhbHVlICE9PSAnJyA/IEpTT04ucGFyc2UoYXR0LnZhbHVlKSA6IGF0dC52YWx1ZTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZmllbGQgPSBuZXcgTWFnaWNTdWdnZXN0KHRoaXMsICQuZXh0ZW5kKFtdLCAkLmZuLm1hZ2ljU3VnZ2VzdC5kZWZhdWx0cywgb3B0aW9ucywgZGVmKSk7XHJcbiAgICAgICAgICAgIGNudHIuZGF0YSgnbWFnaWNTdWdnZXN0JywgZmllbGQpO1xyXG4gICAgICAgICAgICBmaWVsZC5jb250YWluZXIuZGF0YSgnbWFnaWNTdWdnZXN0JywgZmllbGQpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZihvYmouc2l6ZSgpID09PSAxKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmouZGF0YSgnbWFnaWNTdWdnZXN0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9O1xyXG5cclxuICAgJC5mbi5tYWdpY1N1Z2dlc3QuZGVmYXVsdHMgPSB7fTtcclxufSkoalF1ZXJ5KTtcclxuIl19
