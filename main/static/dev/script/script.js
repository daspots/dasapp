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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbW1vbi9hcGkuY29mZmVlIiwiY29tbW9uL3VwbG9hZC5jb2ZmZWUiLCJjb21tb24vdXRpbC5jb2ZmZWUiLCJzaXRlL2FwcC5jb2ZmZWUiLCJzaXRlL2F1dGguY29mZmVlIiwic2l0ZS9wcmV0dHktZmlsZS5jb2ZmZWUiLCJzaXRlL3Jlc291cmNlLmNvZmZlZSIsInNpdGUvdXNlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQSxNQUFNLENBQUMsUUFBUCxHQUFrQixTQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsTUFBZCxFQUFzQixJQUF0QixFQUE0QixRQUE1QjtBQUNoQixRQUFBO0lBQUEsUUFBQSxHQUFXLFFBQUEsSUFBWSxJQUFaLElBQW9CO0lBQy9CLElBQUEsR0FBTyxJQUFBLElBQVE7SUFDZixJQUFHLFNBQVMsQ0FBQyxNQUFWLEtBQW9CLENBQXZCO01BQ0UsSUFBQSxHQUFPLE9BRFQ7O0lBRUEsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFxQixDQUF4QjtNQUNFLE1BQUEsR0FBUztNQUNULElBQUEsR0FBTyxPQUZUOztJQUdBLE1BQUEsR0FBUyxNQUFBLElBQVU7QUFDbkIsU0FBQSxXQUFBOztNQUNFLElBQXdCLFNBQXhCO1FBQUEsT0FBTyxNQUFPLENBQUEsQ0FBQSxFQUFkOztBQURGO0lBRUEsU0FBQSxHQUFlLEdBQUcsQ0FBQyxNQUFKLENBQVcsS0FBWCxDQUFBLElBQXFCLENBQXhCLEdBQStCLEdBQS9CLEdBQXdDO1dBQ3BELENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxJQUFBLEVBQU0sTUFBTjtNQUNBLEdBQUEsRUFBSyxFQUFBLEdBQUcsR0FBSCxHQUFTLFNBQVQsR0FBb0IsQ0FBQyxDQUFDLENBQUMsS0FBRixDQUFRLE1BQVIsQ0FBRCxDQUR6QjtNQUVBLFdBQUEsRUFBYSxrQkFGYjtNQUdBLE9BQUEsRUFBUyxrQkFIVDtNQUlBLFFBQUEsRUFBVSxNQUpWO01BS0EsSUFBQSxFQUFTLElBQUgsR0FBYSxJQUFJLENBQUMsU0FBTCxDQUFlLElBQWYsQ0FBYixHQUF1QyxNQUw3QztNQU1BLE9BQUEsRUFBUyxTQUFDLElBQUQ7QUFDUCxZQUFBO1FBQUEsSUFBRyxJQUFJLENBQUMsTUFBTCxLQUFlLFNBQWxCO1VBQ0UsSUFBQSxHQUFPO1VBQ1AsSUFBRyxJQUFJLENBQUMsUUFBUjtZQUNFLElBQUEsR0FBTyxTQUFDLFFBQUQ7cUJBQWMsUUFBQSxDQUFTLE1BQVQsRUFBaUIsSUFBSSxDQUFDLFFBQXRCLEVBQWdDLEVBQWhDLEVBQW9DLFFBQXBDO1lBQWQsRUFEVDs7a0RBRUEsU0FBVSxRQUFXLElBQUksQ0FBQyxRQUFRLGVBSnBDO1NBQUEsTUFBQTtrREFNRSxTQUFVLGVBTlo7O01BRE8sQ0FOVDtNQWNBLEtBQUEsRUFBTyxTQUFDLEtBQUQsRUFBUSxVQUFSLEVBQW9CLFdBQXBCO0FBQ0wsWUFBQTtRQUFBLEtBQUEsR0FDRTtVQUFBLFVBQUEsRUFBWSxZQUFaO1VBQ0EsV0FBQSxFQUFhLFVBRGI7VUFFQSxZQUFBLEVBQWMsV0FGZDtVQUdBLEtBQUEsRUFBTyxLQUhQOztBQUlGO1VBQ0UsSUFBMkMsS0FBSyxDQUFDLFlBQWpEO1lBQUEsS0FBQSxHQUFRLENBQUMsQ0FBQyxTQUFGLENBQVksS0FBSyxDQUFDLFlBQWxCLEVBQVI7V0FERjtTQUFBLGNBQUE7VUFFTTtVQUNKLEtBQUEsR0FBUSxNQUhWOztRQUlBLEdBQUEsQ0FBSSxnQkFBSixFQUFzQixLQUF0QjtnREFDQSxTQUFVO01BWEwsQ0FkUDtLQURGO0VBWmdCO0FBQWxCOzs7QUNBQTtBQUFBLE1BQUE7OztFQUFBLENBQUMsU0FBQTtXQUNPLE1BQU0sQ0FBQztNQUNFLHNCQUFDLE9BQUQ7QUFDWCxZQUFBO1FBRFksSUFBQyxDQUFBLFVBQUQ7Ozs7Ozs7UUFDWixJQUFDLENBQUEsY0FBRCxHQUFrQixJQUFDLENBQUEsT0FBTyxDQUFDO1FBQzNCLElBQUMsQ0FBQSxRQUFELEdBQVksSUFBQyxDQUFBLE9BQU8sQ0FBQztRQUNyQixJQUFDLENBQUEsU0FBRCxHQUFhLElBQUMsQ0FBQSxPQUFPLENBQUM7UUFDdEIsSUFBQyxDQUFBLFVBQUQsR0FBYyxJQUFDLENBQUEsT0FBTyxDQUFDLFVBQVQsSUFBdUIsQ0FBQSxTQUFBLEdBQVUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUExQjtRQUNyQyxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFDLENBQUEsT0FBTyxDQUFDLGVBQVQsSUFBNEI7UUFDL0MsSUFBQyxDQUFBLGFBQUQsR0FBaUIsSUFBQyxDQUFBLE9BQU8sQ0FBQztRQUMxQixJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxPQUFPLENBQUM7UUFFckIsSUFBQyxDQUFBLFlBQUQsR0FBZ0I7O2FBRVAsQ0FBRSxJQUFYLENBQWdCLFFBQWhCLEVBQTBCLENBQUEsU0FBQSxLQUFBO21CQUFBLFNBQUMsQ0FBRDtxQkFDeEIsS0FBQyxDQUFBLG1CQUFELENBQXFCLENBQXJCO1lBRHdCO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQjs7UUFHQSxHQUFBLEdBQU0sSUFBSSxjQUFKLENBQUE7UUFDTixJQUFHLHdCQUFBLElBQWdCLEdBQUcsQ0FBQyxNQUF2QjtVQUNFLElBQUMsQ0FBQSxTQUFTLENBQUMsRUFBWCxDQUFjLFVBQWQsRUFBMEIsSUFBQyxDQUFBLGVBQTNCO1VBQ0EsSUFBQyxDQUFBLFNBQVMsQ0FBQyxFQUFYLENBQWMsV0FBZCxFQUEyQixJQUFDLENBQUEsZUFBNUI7VUFDQSxJQUFDLENBQUEsU0FBUyxDQUFDLEVBQVgsQ0FBYyxNQUFkLEVBQXNCLENBQUEsU0FBQSxLQUFBO21CQUFBLFNBQUMsQ0FBRDtxQkFDcEIsS0FBQyxDQUFBLG1CQUFELENBQXFCLENBQXJCO1lBRG9CO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF0QjtVQUVBLElBQUMsQ0FBQSxTQUFTLENBQUMsSUFBWCxDQUFBLEVBTEY7O1FBT0EsTUFBTSxDQUFDLGNBQVAsR0FBd0IsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTtZQUN0QixJQUFHLCtCQUFBLElBQXNCLEtBQUMsQ0FBQSxZQUFELEdBQWdCLENBQXpDO0FBQ0UscUJBQU8sS0FBQyxDQUFBLGdCQURWOztVQURzQjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7TUF0QmI7OzZCQTBCYixlQUFBLEdBQWlCLFNBQUMsQ0FBRDtRQUNmLElBQU8sc0JBQVA7QUFDRSxpQkFERjs7UUFFQSxDQUFDLENBQUMsZUFBRixDQUFBO1FBQ0EsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtRQUNBLElBQUcsQ0FBQyxDQUFDLElBQUYsS0FBVSxVQUFiO2lCQUNFLElBQUMsQ0FBQSxTQUFTLENBQUMsUUFBWCxDQUFvQixZQUFwQixFQURGO1NBQUEsTUFBQTtpQkFHRSxJQUFDLENBQUEsU0FBUyxDQUFDLFdBQVgsQ0FBdUIsWUFBdkIsRUFIRjs7TUFMZTs7NkJBVWpCLG1CQUFBLEdBQXFCLFNBQUMsQ0FBRDtBQUNuQixZQUFBO1FBQUEsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsQ0FBakI7UUFDQSxLQUFBLHNEQUFvQyxDQUFFLGVBQTlCLHFDQUErQyxDQUFFLGVBQWpELDJDQUF3RSxDQUFFO1FBQ2xGLHFCQUFHLEtBQUssQ0FBRSxnQkFBUCxHQUFnQixDQUFuQjtpQkFDRSxJQUFDLENBQUEsWUFBRCxDQUFjLEtBQWQsRUFERjs7TUFIbUI7OzZCQU1yQixZQUFBLEdBQWMsU0FBQyxLQUFEO2VBQ1osSUFBQyxDQUFBLGVBQUQsQ0FBaUIsS0FBSyxDQUFDLE1BQXZCLEVBQStCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsS0FBRCxFQUFRLElBQVI7WUFDN0IsSUFBRyxLQUFIO2NBQ0UsT0FBTyxDQUFDLEdBQVIsQ0FBWSxvQkFBWixFQUFrQyxLQUFsQztBQUNBLHFCQUZGOzttQkFHQSxLQUFDLENBQUEsYUFBRCxDQUFlLEtBQWYsRUFBc0IsSUFBdEIsRUFBNEIsQ0FBNUI7VUFKNkI7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQS9CO01BRFk7OzZCQU9kLGVBQUEsR0FBaUIsU0FBQyxDQUFELEVBQUksUUFBSjtRQUNmLElBQVUsQ0FBQSxJQUFLLENBQWY7QUFBQSxpQkFBQTs7ZUFDQSxRQUFBLENBQVMsS0FBVCxFQUFnQixJQUFDLENBQUEsVUFBakIsRUFBNkI7VUFBQyxLQUFBLEVBQU8sQ0FBUjtTQUE3QixFQUF5QyxTQUFDLEtBQUQsRUFBUSxNQUFSO1VBQ3ZDLElBQUcsS0FBSDtZQUNFLFFBQUEsQ0FBUyxLQUFUO0FBQ0Esa0JBQU0sTUFGUjs7aUJBR0EsUUFBQSxDQUFTLE1BQVQsRUFBb0IsTUFBcEI7UUFKdUMsQ0FBekM7TUFGZTs7NkJBUWpCLGFBQUEsR0FBZSxTQUFDLEtBQUQsRUFBUSxJQUFSLEVBQWMsQ0FBZDtBQUNiLFlBQUE7UUFBQSxJQUFVLENBQUEsSUFBSyxLQUFLLENBQUMsTUFBckI7QUFBQSxpQkFBQTs7ZUFDQSxJQUFDLENBQUEsV0FBRCxDQUFhLEtBQU0sQ0FBQSxDQUFBLENBQW5CLEVBQXVCLElBQUssQ0FBQSxDQUFBLENBQUUsQ0FBQyxVQUEvQiwyQ0FBMEQsQ0FBRSxPQUFqQixDQUF5QixLQUFNLENBQUEsQ0FBQSxDQUEvQixVQUEzQyxFQUErRSxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFBO21CQUM3RSxLQUFDLENBQUEsYUFBRCxDQUFlLEtBQWYsRUFBc0IsSUFBdEIsRUFBNEIsQ0FBQSxHQUFJLENBQWhDLEVBQW1DLDRCQUFuQztVQUQ2RTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0U7TUFGYTs7NkJBS2YsV0FBQSxHQUFhLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxRQUFaLEVBQXNCLFFBQXRCO0FBQ1gsWUFBQTtRQUFBLEdBQUEsR0FBTSxJQUFJLGNBQUosQ0FBQTtRQUNOLDZDQUFpQixDQUFFLGdCQUFoQixHQUF5QixDQUE1QjtVQUNFLFdBQUcsSUFBSSxDQUFDLElBQUwsRUFBQSxhQUFpQixJQUFDLENBQUEsYUFBbEIsRUFBQSxJQUFBLEtBQUg7WUFDRSxRQUFBLENBQVMsQ0FBVCxFQUFZLE1BQVosRUFBdUIsWUFBdkI7WUFDQSxRQUFBLENBQUE7QUFDQSxtQkFIRjtXQURGOztRQU1BLElBQUcscUJBQUg7VUFDRSxJQUFHLElBQUksQ0FBQyxJQUFMLEdBQVksSUFBQyxDQUFBLFFBQWhCO1lBQ0UsUUFBQSxDQUFTLENBQVQsRUFBWSxNQUFaLEVBQXVCLFNBQXZCO1lBQ0EsUUFBQSxDQUFBO0FBQ0EsbUJBSEY7V0FERjs7UUFPQSxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFYLENBQTRCLFVBQTVCLEVBQXdDLFNBQUMsS0FBRDtpQkFDdEMsUUFBQSxDQUFTLFFBQUEsQ0FBUyxLQUFLLENBQUMsTUFBTixHQUFlLEtBQUssQ0FBQyxLQUFyQixHQUE2QixLQUF0QyxDQUFUO1FBRHNDLENBQXhDO1FBR0EsR0FBRyxDQUFDLGtCQUFKLEdBQXlCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsS0FBRDtBQUN2QixnQkFBQTtZQUFBLElBQUcsR0FBRyxDQUFDLFVBQUosS0FBa0IsQ0FBckI7Y0FDRSxJQUFHLEdBQUcsQ0FBQyxNQUFKLEtBQWMsR0FBakI7Z0JBQ0UsUUFBQSxHQUFXLElBQUksQ0FBQyxLQUFMLENBQVcsR0FBRyxDQUFDLFlBQWY7Z0JBQ1gsUUFBQSxDQUFTLEtBQVQsRUFBZ0IsUUFBUSxDQUFDLE1BQXpCO2dCQUVBLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxHQUFaLENBQWdCLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxHQUFaLENBQUEsQ0FBQSxHQUFxQixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQXJDLEdBQTBDLEdBQTFEO3VCQUNBLEtBQUMsQ0FBQSxZQUFELElBQWlCLEVBTG5CO2VBQUEsTUFBQTtnQkFPRSxRQUFBLENBQVMsQ0FBVCxFQUFZLE1BQVosRUFBdUIsT0FBdkI7dUJBQ0EsS0FBQyxDQUFBLFlBQUQsSUFBaUIsRUFSbkI7ZUFERjs7VUFEdUI7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1FBWXpCLEdBQUcsQ0FBQyxJQUFKLENBQVMsTUFBVCxFQUFpQixHQUFqQixFQUFzQixJQUF0QjtRQUNBLElBQUEsR0FBTyxJQUFJLFFBQUosQ0FBQTtRQUNQLElBQUksQ0FBQyxNQUFMLENBQVksTUFBWixFQUFvQixJQUFwQjtRQUNBLEdBQUcsQ0FBQyxJQUFKLENBQVMsSUFBVDtlQUNBLFFBQUEsQ0FBQTtNQWxDVzs7Ozs7RUFoRWhCLENBQUQsQ0FBQSxDQUFBO0FBQUE7OztBQ0FBO0VBQUEsTUFBTSxDQUFDLEdBQVAsR0FBYSxTQUFBO29HQUNYLE9BQU8sQ0FBRSxtQkFBSztFQURIOztFQUliLE1BQU0sQ0FBQyxXQUFQLEdBQXFCLFNBQUE7SUFDbkIsbUJBQUEsQ0FBQTtJQUNBLG1CQUFBLENBQUE7SUFDQSx5QkFBQSxDQUFBO0lBQ0EsU0FBQSxDQUFBO0lBQ0EsaUJBQUEsQ0FBQTtXQUNBLGFBQUEsQ0FBQTtFQU5tQjs7RUFTckIsTUFBTSxDQUFDLG1CQUFQLEdBQTZCLFNBQUE7V0FDM0IsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLGNBQXRCLEVBQXNDLFNBQUE7YUFDcEMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLE1BQVIsQ0FBZSxTQUFmO0lBRG9DLENBQXRDO0VBRDJCOztFQUs3QixNQUFNLENBQUMsbUJBQVAsR0FBNkIsU0FBQTtXQUMzQixDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsY0FBdEIsRUFBc0MsU0FBQTtNQUNwQyxJQUFHLENBQUksT0FBQSxDQUFRLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsU0FBYixDQUFBLElBQTJCLGVBQW5DLENBQVA7ZUFDRSxLQUFLLENBQUMsY0FBTixDQUFBLEVBREY7O0lBRG9DLENBQXRDO0VBRDJCOztFQU03QixNQUFNLENBQUMseUJBQVAsR0FBbUMsU0FBQTtXQUNqQyxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0Isb0JBQXRCLEVBQTRDLFNBQUE7QUFDMUMsVUFBQTtNQUFBLE9BQUEsR0FBVSxDQUFBLENBQUUsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxRQUFiLENBQUY7TUFDVixPQUFPLENBQUMsS0FBUixDQUFBO01BQ0EsSUFBRyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsUUFBUixDQUFpQixRQUFqQixDQUFIO2VBQ0UsT0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiLEVBQXFCLFVBQXJCLEVBREY7T0FBQSxNQUFBO2VBR0UsT0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiLEVBQXFCLE1BQXJCLEVBSEY7O0lBSDBDLENBQTVDO0VBRGlDOztFQVVuQyxNQUFNLENBQUMsU0FBUCxHQUFtQixTQUFBO0FBQ2pCLFFBQUE7SUFBQSxJQUFHLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxNQUFWLEdBQW1CLENBQXRCO01BQ0UsV0FBQSxHQUFjLFNBQUE7UUFDWixDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxJQUFwQixDQUF5QixTQUFBO0FBQ3ZCLGNBQUE7VUFBQSxJQUFBLEdBQU8sTUFBTSxDQUFDLEdBQVAsQ0FBVyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFhLFVBQWIsQ0FBWDtVQUNQLElBQUEsR0FBTyxNQUFBLENBQUEsQ0FBUSxDQUFDLElBQVQsQ0FBYyxJQUFkLEVBQXFCLE1BQXJCO1VBQ1AsSUFBRyxJQUFBLEdBQU8sRUFBVjtZQUNFLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsSUFBSSxDQUFDLEtBQUwsQ0FBQSxDQUFZLENBQUMsTUFBYixDQUFvQixZQUFwQixDQUFiLEVBREY7V0FBQSxNQUFBO1lBR0UsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxJQUFJLENBQUMsT0FBTCxDQUFBLENBQWIsRUFIRjs7aUJBSUEsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxPQUFiLEVBQXNCLElBQUksQ0FBQyxLQUFMLENBQUEsQ0FBWSxDQUFDLE1BQWIsQ0FBb0IsZ0NBQXBCLENBQXRCO1FBUHVCLENBQXpCO2VBUUEsVUFBQSxDQUFXLFNBQVMsQ0FBQyxNQUFyQixFQUE2QixJQUFBLEdBQU8sRUFBcEM7TUFUWTthQVVkLFdBQUEsQ0FBQSxFQVhGOztFQURpQjs7RUFlbkIsTUFBTSxDQUFDLGlCQUFQLEdBQTJCLFNBQUE7SUFDekIsQ0FBQSxDQUFFLGtDQUFGLENBQXFDLENBQUMsS0FBdEMsQ0FBNEMsU0FBQTtnRkFDMUMsY0FBYyxDQUFFLE9BQWhCLENBQXdCLG9CQUF4QixFQUE4QyxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUFBLENBQTlDO0lBRDBDLENBQTVDO0lBR0Esd0VBQUcsY0FBYyxDQUFFLE9BQWhCLENBQXdCLG9CQUF4QixXQUFBLEtBQWlELENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLElBQXpCLENBQUEsQ0FBcEQ7YUFDRSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUFBLEVBREY7O0VBSnlCOztFQVEzQixNQUFNLENBQUMsYUFBUCxHQUF1QixTQUFBO0lBQ3JCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxFQUFWLENBQWEsT0FBYixFQUFzQixXQUF0QixFQUFtQyxTQUFBO2FBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBaEIsR0FBdUIsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxNQUFiO0lBRFUsQ0FBbkM7V0FHQSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsV0FBdEIsRUFBbUMsU0FBQyxDQUFEO2FBQ2pDLENBQUMsQ0FBQyxlQUFGLENBQUE7SUFEaUMsQ0FBbkM7RUFKcUI7O0VBUXZCLE1BQU0sQ0FBQyxtQkFBUCxHQUE2QixTQUFBO1dBQzNCLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEtBQXBCLENBQUE7RUFEMkI7O0VBSTdCLE1BQU0sQ0FBQyxpQkFBUCxHQUEyQixTQUFDLE9BQUQsRUFBVSxRQUFWOztNQUFVLFdBQVM7O0lBQzVDLG1CQUFBLENBQUE7SUFDQSxJQUFVLENBQUksT0FBZDtBQUFBLGFBQUE7O1dBRUEsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsTUFBcEIsQ0FBMkIsNkNBQUEsR0FDcUIsUUFEckIsR0FDOEIsaUhBRDlCLEdBR25CLE9BSG1CLEdBR1gsVUFIaEI7RUFKeUI7O0VBWTNCLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFNBQUMsTUFBRDtBQUNsQixRQUFBO0FBQUE7QUFBQSxTQUFBLHFDQUFBOztNQUNFLElBQUcsTUFBQSxHQUFTLElBQVo7UUFDRSxJQUFHLE1BQUEsS0FBVSxHQUFiO0FBQ0UsaUJBQVUsTUFBRCxHQUFRLEdBQVIsR0FBVyxPQUR0Qjs7QUFFQSxlQUFTLENBQUMsUUFBQSxDQUFTLE1BQUEsR0FBUyxFQUFsQixDQUFBLEdBQXdCLEVBQXpCLENBQUEsR0FBNEIsR0FBNUIsR0FBK0IsT0FIMUM7O01BSUEsTUFBQSxJQUFVO0FBTFo7RUFEa0I7QUFqRnBCOzs7QUNBQTtFQUFBLENBQUEsQ0FBRSxTQUFBO1dBQ0EsV0FBQSxDQUFBO0VBREEsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxJQUFmLENBQW9CLFNBQUE7YUFDdkIsU0FBQSxDQUFBO0lBRHVCLENBQXBCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLElBQXBCLENBQXlCLFNBQUE7YUFDNUIsY0FBQSxDQUFBO0lBRDRCLENBQXpCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxpQkFBRixDQUFvQixDQUFDLElBQXJCLENBQTBCLFNBQUE7YUFDN0IsZUFBQSxDQUFBO0lBRDZCLENBQTFCO0VBQUgsQ0FBRjs7RUFHQSxDQUFBLENBQUUsU0FBQTtXQUFHLENBQUEsQ0FBRSxvQkFBRixDQUF1QixDQUFDLElBQXhCLENBQTZCLFNBQUE7YUFDaEMsa0JBQUEsQ0FBQTtJQURnQyxDQUE3QjtFQUFILENBQUY7O0VBR0EsQ0FBQSxDQUFFLFNBQUE7V0FBRyxDQUFBLENBQUUsb0JBQUYsQ0FBdUIsQ0FBQyxJQUF4QixDQUE2QixTQUFBO2FBQ2hDLGtCQUFBLENBQUE7SUFEZ0MsQ0FBN0I7RUFBSCxDQUFGOztFQUdBLENBQUEsQ0FBRSxTQUFBO1dBQUcsQ0FBQSxDQUFFLHNCQUFGLENBQXlCLENBQUMsSUFBMUIsQ0FBK0IsU0FBQTthQUNsQyxvQkFBQSxDQUFBO0lBRGtDLENBQS9CO0VBQUgsQ0FBRjtBQWxCQTs7O0FDQUE7RUFBQSxNQUFNLENBQUMsU0FBUCxHQUFtQixTQUFBO0lBQ2pCLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxNQUFmLENBQXNCLFNBQUE7QUFDcEIsVUFBQTtNQUFBLE9BQUEsR0FBVSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLE9BQWpCLENBQUEsQ0FBMEIsQ0FBQyxNQUEzQixDQUFrQyxDQUFBLENBQUUsa0JBQUYsQ0FBcUIsQ0FBQyxPQUF0QixDQUFBLENBQWxDO0FBQ1Y7V0FBQSx5Q0FBQTs7UUFDRSxJQUFBLEdBQU8sQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLElBQVYsQ0FBZSxNQUFmO1FBQ1AsSUFBRyxDQUFBLENBQUUsaUJBQUYsQ0FBb0IsQ0FBQyxFQUFyQixDQUF3QixVQUF4QixDQUFIO1VBQ0UsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLElBQVYsQ0FBZSxNQUFmLEVBQTBCLElBQUQsR0FBTSxnQkFBL0I7dUJBQ0EsQ0FBQSxDQUFFLFdBQUYsQ0FBYyxDQUFDLElBQWYsQ0FBb0IsU0FBcEIsRUFBK0IsSUFBL0IsR0FGRjtTQUFBLE1BQUE7VUFJRSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsSUFBVixDQUFlLE1BQWYsRUFBdUIsSUFBSSxDQUFDLE9BQUwsQ0FBYSxnQkFBYixFQUErQixFQUEvQixDQUF2Qjt1QkFDQSxDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsSUFBZixDQUFvQixTQUFwQixFQUErQixLQUEvQixHQUxGOztBQUZGOztJQUZvQixDQUF0QjtXQVdBLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxNQUFmLENBQUE7RUFaaUI7QUFBbkI7OztBQ0NBO0VBQUEsSUFBRyxDQUFBLENBQUUsY0FBRixDQUFpQixDQUFDLE1BQXJCO0lBQ0UsQ0FBQSxDQUFFLGNBQUYsQ0FBaUIsQ0FBQyxJQUFsQixDQUF1QixTQUFBO0FBQ3JCLFVBQUE7TUFBQSxXQUFBLEdBQWMsQ0FBQSxDQUFFLElBQUY7TUFDZCxVQUFBLEdBQWEsV0FBVyxDQUFDLElBQVosQ0FBaUIsb0JBQWpCO01BQ2IsVUFBVSxDQUFDLElBQVgsQ0FBQTtNQUNBLFVBQVUsQ0FBQyxNQUFYLENBQWtCLFNBQUE7QUFDaEIsWUFBQTtRQUFBLEtBQUEsR0FBUSxVQUFXLENBQUEsQ0FBQSxDQUFFLENBQUM7UUFDdEIsSUFBQSxHQUFPO1FBQ1AsSUFBRyxLQUFLLENBQUMsTUFBTixHQUFlLENBQWxCO1VBQ0UsSUFBQSxHQUFVLEtBQUssQ0FBQyxNQUFQLEdBQWMsa0JBRHpCO1NBQUEsTUFBQTtVQUdFLElBQUEsR0FBTyxVQUFVLENBQUMsR0FBWCxDQUFBLENBQWdCLENBQUMsS0FBakIsQ0FBdUIsSUFBdkI7VUFDUCxJQUFBLEdBQU8sSUFBSyxDQUFBLElBQUksQ0FBQyxNQUFMLEdBQWMsQ0FBZCxFQUpkOztlQUtBLFdBQVcsQ0FBQyxJQUFaLENBQWlCLG9CQUFqQixDQUFzQyxDQUFDLEdBQXZDLENBQTJDLElBQTNDO01BUmdCLENBQWxCO2FBU0EsV0FBVyxDQUFDLElBQVosQ0FBaUIsY0FBakIsQ0FBZ0MsQ0FBQyxLQUFqQyxDQUF1QyxTQUFDLENBQUQ7UUFDckMsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtRQUNBLFVBQVUsQ0FBQyxLQUFYLENBQUE7ZUFDQSxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFBO01BSHFDLENBQXZDO0lBYnFCLENBQXZCLEVBREY7O0FBQUE7OztBQ0RBO0FBQUEsTUFBQTs7RUFBQSxNQUFNLENBQUMsa0JBQVAsR0FBNEIsU0FBQTtXQUMxQiwyQkFBQSxDQUFBO0VBRDBCOztFQUc1QixNQUFNLENBQUMsa0JBQVAsR0FBNEIsU0FBQTtXQUMxQiwyQkFBQSxDQUFBO0VBRDBCOztFQUc1QixNQUFNLENBQUMsb0JBQVAsR0FBOEIsU0FBQTtJQUM1QixJQUFHLE1BQU0sQ0FBQyxJQUFQLElBQWdCLE1BQU0sQ0FBQyxRQUF2QixJQUFvQyxNQUFNLENBQUMsVUFBOUM7YUFDRSxNQUFNLENBQUMsYUFBUCxHQUF1QixJQUFJLFlBQUosQ0FDckI7UUFBQSxjQUFBLEVBQWdCLGNBQWhCO1FBQ0EsUUFBQSxFQUFVLENBQUEsQ0FBRSxPQUFGLENBRFY7UUFFQSxTQUFBLEVBQVcsQ0FBQSxDQUFFLFlBQUYsQ0FGWDtRQUdBLGVBQUEsRUFBaUIsaUNBSGpCO1FBSUEsVUFBQSxFQUFZLENBQUEsQ0FBRSxPQUFGLENBQVUsQ0FBQyxJQUFYLENBQWdCLGdCQUFoQixDQUpaO1FBS0EsYUFBQSxFQUFlLEVBTGY7UUFNQSxRQUFBLEVBQVUsSUFBQSxHQUFPLElBQVAsR0FBYyxJQU54QjtPQURxQixFQUR6Qjs7RUFENEI7O0VBVzlCLGNBQUEsR0FDRTtJQUFBLE9BQUEsRUFBUyxTQUFDLElBQUQ7QUFDUCxVQUFBO01BQUEsU0FBQSxHQUFZLENBQUEsQ0FBRSwrSEFBQSxHQUlBLElBQUksQ0FBQyxJQUpMLEdBSVUsNktBSlo7TUFZWixRQUFBLEdBQVcsQ0FBQSxDQUFFLFVBQUYsRUFBYyxTQUFkO01BRVgsSUFBRyxhQUFhLENBQUMsWUFBZCxHQUE2QixFQUE3QixJQUFvQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQVYsQ0FBa0IsT0FBbEIsQ0FBQSxLQUE4QixDQUFyRTtRQUNFLE1BQUEsR0FBUyxJQUFJLFVBQUosQ0FBQTtRQUNULE1BQU0sQ0FBQyxNQUFQLEdBQWdCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsQ0FBRDttQkFDZCxRQUFRLENBQUMsR0FBVCxDQUFhLGtCQUFiLEVBQWlDLE1BQUEsR0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQWhCLEdBQXVCLEdBQXhEO1VBRGM7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1FBRWhCLE1BQU0sQ0FBQyxhQUFQLENBQXFCLElBQXJCLEVBSkY7T0FBQSxNQUFBO1FBTUUsUUFBUSxDQUFDLElBQVQsQ0FBYyxJQUFJLENBQUMsSUFBTCxJQUFhLDBCQUEzQixFQU5GOztNQVFBLENBQUEsQ0FBRSxtQkFBRixDQUFzQixDQUFDLE9BQXZCLENBQStCLFNBQS9CO2FBRUEsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXFCLEtBQXJCO1VBQ0UsSUFBRyxLQUFIO1lBQ0UsQ0FBQSxDQUFFLGVBQUYsRUFBbUIsU0FBbkIsQ0FBNkIsQ0FBQyxHQUE5QixDQUFrQyxPQUFsQyxFQUEyQyxNQUEzQztZQUNBLENBQUEsQ0FBRSxlQUFGLEVBQW1CLFNBQW5CLENBQTZCLENBQUMsUUFBOUIsQ0FBdUMscUJBQXZDO1lBQ0EsSUFBRyxLQUFBLEtBQVMsU0FBWjtjQUNFLENBQUEsQ0FBRSxnQkFBRixFQUFvQixTQUFwQixDQUE4QixDQUFDLElBQS9CLENBQW9DLHdCQUFBLEdBQXdCLENBQUMsVUFBQSxDQUFXLGFBQWEsQ0FBQyxRQUF6QixDQUFELENBQXhCLEdBQTRELEdBQWhHLEVBREY7YUFBQSxNQUVLLElBQUcsS0FBQSxLQUFTLFlBQVo7Y0FDSCxDQUFBLENBQUUsZ0JBQUYsRUFBb0IsU0FBcEIsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQywwQkFBcEMsRUFERzthQUFBLE1BQUE7Y0FHSCxDQUFBLENBQUUsZ0JBQUYsRUFBb0IsU0FBcEIsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQyxTQUFwQyxFQUhHOztBQUlMLG1CQVRGOztVQVdBLElBQUcsUUFBQSxLQUFZLEtBQVosSUFBc0IsUUFBekI7WUFDRSxDQUFBLENBQUUsZUFBRixFQUFtQixTQUFuQixDQUE2QixDQUFDLFFBQTlCLENBQXVDLHNCQUF2QztZQUNBLENBQUEsQ0FBRSxnQkFBRixFQUFvQixTQUFwQixDQUE4QixDQUFDLElBQS9CLENBQW9DLFVBQUEsR0FBVSxDQUFDLFVBQUEsQ0FBVyxJQUFJLENBQUMsSUFBaEIsQ0FBRCxDQUE5QztZQUNBLElBQUcsUUFBUSxDQUFDLFNBQVQsSUFBdUIsUUFBUSxDQUFDLElBQVQsQ0FBQSxDQUFlLENBQUMsTUFBaEIsR0FBeUIsQ0FBbkQ7Y0FDRSxRQUFRLENBQUMsR0FBVCxDQUFhLGtCQUFiLEVBQWlDLE1BQUEsR0FBTyxRQUFRLENBQUMsU0FBaEIsR0FBMEIsR0FBM0Q7cUJBQ0EsUUFBUSxDQUFDLElBQVQsQ0FBYyxFQUFkLEVBRkY7YUFIRjtXQUFBLE1BTUssSUFBRyxRQUFBLEtBQVksS0FBZjtZQUNILENBQUEsQ0FBRSxlQUFGLEVBQW1CLFNBQW5CLENBQTZCLENBQUMsR0FBOUIsQ0FBa0MsT0FBbEMsRUFBMkMsTUFBM0M7bUJBQ0EsQ0FBQSxDQUFFLGdCQUFGLEVBQW9CLFNBQXBCLENBQThCLENBQUMsSUFBL0IsQ0FBb0MscUJBQXBDLEVBRkc7V0FBQSxNQUFBO1lBSUgsQ0FBQSxDQUFFLGVBQUYsRUFBbUIsU0FBbkIsQ0FBNkIsQ0FBQyxHQUE5QixDQUFrQyxPQUFsQyxFQUE4QyxRQUFELEdBQVUsR0FBdkQ7bUJBQ0EsQ0FBQSxDQUFFLGdCQUFGLEVBQW9CLFNBQXBCLENBQThCLENBQUMsSUFBL0IsQ0FBdUMsUUFBRCxHQUFVLE9BQVYsR0FBZ0IsQ0FBQyxVQUFBLENBQVcsSUFBSSxDQUFDLElBQWhCLENBQUQsQ0FBdEQsRUFMRzs7UUFsQlA7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO0lBekJPLENBQVQ7OztFQW1ERixNQUFNLENBQUMsMkJBQVAsR0FBcUMsU0FBQTtXQUNuQyxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsRUFBVixDQUFhLE9BQWIsRUFBc0IsYUFBdEIsRUFBcUMsU0FBQyxDQUFEO01BQ25DLENBQUMsQ0FBQyxjQUFGLENBQUE7TUFDQSxJQUFHLE9BQUEsQ0FBUSxpQ0FBUixDQUFIO1FBQ0UsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLFVBQXpCO2VBQ0EsUUFBQSxDQUFTLFFBQVQsRUFBbUIsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxTQUFiLENBQW5CLEVBQTRDLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsR0FBRCxFQUFNLE1BQU47QUFDMUMsZ0JBQUE7WUFBQSxJQUFHLEdBQUg7Y0FDRSxDQUFBLENBQUUsS0FBRixDQUFPLENBQUMsVUFBUixDQUFtQixVQUFuQjtjQUNBLEdBQUEsQ0FBSSw4Q0FBSixFQUFvRCxHQUFwRDtBQUNBLHFCQUhGOztZQUlBLE1BQUEsR0FBUyxDQUFBLENBQUUsS0FBRixDQUFPLENBQUMsSUFBUixDQUFhLFFBQWI7WUFDVCxZQUFBLEdBQWUsQ0FBQSxDQUFFLEtBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxjQUFiO1lBQ2YsSUFBRyxNQUFIO2NBQ0UsQ0FBQSxDQUFFLEVBQUEsR0FBRyxNQUFMLENBQWMsQ0FBQyxNQUFmLENBQUEsRUFERjs7WUFFQSxJQUFHLFlBQUg7cUJBQ0UsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFoQixHQUF1QixhQUR6Qjs7VUFUMEM7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTVDLEVBRkY7O0lBRm1DLENBQXJDO0VBRG1DO0FBckVyQzs7O0FDQUE7QUFBQSxNQUFBOztFQUFBLE1BQU0sQ0FBQyxjQUFQLEdBQXdCLFNBQUE7SUFDdEIsb0JBQUEsQ0FBQTtJQUNBLG9CQUFBLENBQUE7V0FDQSxtQkFBQSxDQUFBO0VBSHNCOztFQU14QixvQkFBQSxHQUF1QixTQUFBO0lBQ3JCLENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLElBQXpCLENBQThCLFNBQUE7YUFDNUIsZUFBQSxDQUFnQixDQUFBLENBQUUsSUFBRixDQUFoQjtJQUQ0QixDQUE5QjtJQUdBLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsTUFBakIsQ0FBd0IsU0FBQTtNQUN0QixDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUE5QixFQUF5QyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsRUFBUixDQUFXLFVBQVgsQ0FBekM7YUFDQSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUFBO2VBQzVCLGVBQUEsQ0FBZ0IsQ0FBQSxDQUFFLElBQUYsQ0FBaEI7TUFENEIsQ0FBOUI7SUFGc0IsQ0FBeEI7V0FLQSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxNQUF6QixDQUFnQyxTQUFBO2FBQzlCLGVBQUEsQ0FBZ0IsQ0FBQSxDQUFFLElBQUYsQ0FBaEI7SUFEOEIsQ0FBaEM7RUFUcUI7O0VBYXZCLGVBQUEsR0FBa0IsU0FBQyxRQUFEO0lBQ2hCLHNCQUFBLENBQUE7V0FDQSxDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxJQUF6QixDQUE4QixTQUFBO0FBQzVCLFVBQUE7TUFBQSxFQUFBLEdBQUssUUFBUSxDQUFDLEdBQVQsQ0FBQTthQUNMLENBQUEsQ0FBRSxHQUFBLEdBQUksRUFBTixDQUFXLENBQUMsV0FBWixDQUF3QixTQUF4QixFQUFtQyxRQUFRLENBQUMsRUFBVCxDQUFZLFVBQVosQ0FBbkM7SUFGNEIsQ0FBOUI7RUFGZ0I7O0VBT2xCLHNCQUFBLEdBQXlCLFNBQUE7QUFDdkIsUUFBQTtJQUFBLFFBQUEsR0FBVyxDQUFBLENBQUUsNkJBQUYsQ0FBZ0MsQ0FBQztJQUM1QyxDQUFBLENBQUUsZUFBRixDQUFrQixDQUFDLFdBQW5CLENBQStCLFFBQS9CLEVBQXlDLFFBQUEsS0FBWSxDQUFyRDtJQUNBLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsV0FBakIsQ0FBNkIsUUFBN0IsRUFBdUMsUUFBQSxHQUFXLENBQWxEO0lBQ0EsSUFBRyxRQUFBLEtBQVksQ0FBZjtNQUNFLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsSUFBakIsQ0FBc0IsZUFBdEIsRUFBdUMsS0FBdkM7YUFDQSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLElBQWpCLENBQXNCLFNBQXRCLEVBQWlDLEtBQWpDLEVBRkY7S0FBQSxNQUdLLElBQUcsQ0FBQSxDQUFFLG1DQUFGLENBQXNDLENBQUMsTUFBdkMsS0FBaUQsQ0FBcEQ7TUFDSCxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLElBQWpCLENBQXNCLGVBQXRCLEVBQXVDLEtBQXZDO2FBQ0EsQ0FBQSxDQUFFLGFBQUYsQ0FBZ0IsQ0FBQyxJQUFqQixDQUFzQixTQUF0QixFQUFpQyxJQUFqQyxFQUZHO0tBQUEsTUFBQTthQUlILENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsSUFBakIsQ0FBc0IsZUFBdEIsRUFBdUMsSUFBdkMsRUFKRzs7RUFQa0I7O0VBaUJ6QixvQkFBQSxHQUF1QixTQUFBO1dBQ3JCLENBQUEsQ0FBRSxjQUFGLENBQWlCLENBQUMsS0FBbEIsQ0FBd0IsU0FBQyxDQUFEO0FBQ3RCLFVBQUE7TUFBQSxtQkFBQSxDQUFBO01BQ0EsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtNQUNBLGVBQUEsR0FBa0IsQ0FBQyxDQUFBLENBQUUsSUFBRixDQUFPLENBQUMsSUFBUixDQUFhLFNBQWIsQ0FBRCxDQUF3QixDQUFDLE9BQXpCLENBQWlDLFNBQWpDLEVBQTRDLENBQUEsQ0FBRSw2QkFBRixDQUFnQyxDQUFDLE1BQTdFO01BQ2xCLElBQUcsT0FBQSxDQUFRLGVBQVIsQ0FBSDtRQUNFLFNBQUEsR0FBWTtRQUNaLENBQUEsQ0FBRSw2QkFBRixDQUFnQyxDQUFDLElBQWpDLENBQXNDLFNBQUE7VUFDcEMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLElBQXpCO2lCQUNBLFNBQVMsQ0FBQyxJQUFWLENBQWUsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLEdBQVIsQ0FBQSxDQUFmO1FBRm9DLENBQXRDO1FBR0EsVUFBQSxHQUFhLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsU0FBYjtRQUNiLGVBQUEsR0FBa0IsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxTQUFiO1FBQ2xCLGFBQUEsR0FBZ0IsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxPQUFiO2VBQ2hCLFFBQUEsQ0FBUyxRQUFULEVBQW1CLFVBQW5CLEVBQStCO1VBQUMsU0FBQSxFQUFXLFNBQVMsQ0FBQyxJQUFWLENBQWUsR0FBZixDQUFaO1NBQS9CLEVBQWlFLFNBQUMsR0FBRCxFQUFNLE1BQU47VUFDL0QsSUFBRyxHQUFIO1lBQ0UsQ0FBQSxDQUFFLDhCQUFGLENBQWlDLENBQUMsVUFBbEMsQ0FBNkMsVUFBN0M7WUFDQSxpQkFBQSxDQUFrQixhQUFhLENBQUMsT0FBZCxDQUFzQixTQUF0QixFQUFpQyxTQUFTLENBQUMsTUFBM0MsQ0FBbEIsRUFBc0UsUUFBdEU7QUFDQSxtQkFIRjs7aUJBSUEsQ0FBQSxDQUFFLEdBQUEsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFQLENBQVksS0FBWixDQUFELENBQUwsQ0FBMkIsQ0FBQyxPQUE1QixDQUFvQyxTQUFBO1lBQ2xDLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxNQUFSLENBQUE7WUFDQSxzQkFBQSxDQUFBO21CQUNBLGlCQUFBLENBQWtCLGVBQWUsQ0FBQyxPQUFoQixDQUF3QixTQUF4QixFQUFtQyxTQUFTLENBQUMsTUFBN0MsQ0FBbEIsRUFBd0UsU0FBeEU7VUFIa0MsQ0FBcEM7UUFMK0QsQ0FBakUsRUFSRjs7SUFKc0IsQ0FBeEI7RUFEcUI7O0VBMkJ2QixNQUFNLENBQUMsZUFBUCxHQUF5QixTQUFBO0FBQ3ZCLFFBQUE7SUFBQSxTQUFBLEdBQVksQ0FBQSxDQUFFLFlBQUYsQ0FBZSxDQUFDLEdBQWhCLENBQUE7SUFDWixPQUFBLEdBQVUsQ0FBQSxDQUFFLFVBQUYsQ0FBYSxDQUFDLElBQWQsQ0FBbUIsU0FBbkI7SUFDVixRQUFBLENBQVMsS0FBVCxFQUFnQixPQUFoQixFQUF5QjtNQUFDLFNBQUEsRUFBVyxTQUFaO0tBQXpCLEVBQWlELFNBQUMsS0FBRCxFQUFRLE1BQVI7TUFDL0MsSUFBRyxLQUFIO1FBQ0UsR0FBQSxDQUFJLCtCQUFKO0FBQ0EsZUFGRjs7TUFHQSxNQUFNLENBQUMsUUFBUCxHQUFrQjthQUNsQixDQUFBLENBQUUscUJBQUYsQ0FBd0IsQ0FBQyxVQUF6QixDQUFvQyxVQUFwQztJQUwrQyxDQUFqRDtXQU9BLENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLE1BQXpCLENBQWdDLFNBQUMsS0FBRDtBQUM5QixVQUFBO01BQUEsUUFBQSxHQUFXLENBQUEsQ0FBRSxLQUFLLENBQUMsYUFBUixDQUFzQixDQUFDLEdBQXZCLENBQUE7YUFDWCxtQkFBQSxDQUFvQixRQUFwQjtJQUY4QixDQUFoQztFQVZ1Qjs7RUFlekIsbUJBQUEsR0FBc0IsU0FBQyxRQUFEO0FBQ3BCLFFBQUE7SUFBQSxDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsV0FBZixDQUEyQixTQUEzQixDQUFxQyxDQUFDLFFBQXRDLENBQStDLFFBQS9DO0lBQ0EsQ0FBQSxDQUFFLEdBQUEsR0FBSSxRQUFOLENBQWlCLENBQUMsV0FBbEIsQ0FBOEIsUUFBOUIsQ0FBdUMsQ0FBQyxRQUF4QyxDQUFpRCxTQUFqRDtBQUVBO1NBQUEsMENBQUE7O01BQ0UsSUFBRyxRQUFBLEtBQVksT0FBTyxDQUFDLEdBQXZCO1FBQ0UsQ0FBQSxDQUFFLHNCQUFGLENBQXlCLENBQUMsR0FBMUIsQ0FBOEIsT0FBTyxDQUFDLEdBQXRDO1FBQ0EsQ0FBQSxDQUFFLHNCQUFGLENBQXlCLENBQUMsR0FBMUIsQ0FBOEIsT0FBTyxDQUFDLFFBQXRDO1FBQ0EsQ0FBQSxDQUFFLGtCQUFGLENBQXFCLENBQUMsR0FBdEIsQ0FBMEIsT0FBTyxDQUFDLElBQWxDO1FBQ0EsQ0FBQSxDQUFFLG1CQUFGLENBQXNCLENBQUMsR0FBdkIsQ0FBMkIsT0FBTyxDQUFDLEtBQW5DO0FBQ0EsY0FMRjtPQUFBLE1BQUE7NkJBQUE7O0FBREY7O0VBSm9COztFQWF0QixtQkFBQSxHQUFzQixTQUFBO1dBQ3BCLENBQUEsQ0FBRSxhQUFGLENBQWdCLENBQUMsS0FBakIsQ0FBdUIsU0FBQyxDQUFEO0FBQ3JCLFVBQUE7TUFBQSxDQUFDLENBQUMsY0FBRixDQUFBO01BQ0EsU0FBQSxHQUFZO01BQ1osQ0FBQSxDQUFFLDZCQUFGLENBQWdDLENBQUMsSUFBakMsQ0FBc0MsU0FBQTtlQUNwQyxTQUFTLENBQUMsSUFBVixDQUFlLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxHQUFSLENBQUEsQ0FBZjtNQURvQyxDQUF0QztNQUVBLGNBQUEsR0FBaUIsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxnQkFBYjthQUNqQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQWhCLEdBQTBCLGNBQUQsR0FBZ0IsYUFBaEIsR0FBNEIsQ0FBQyxTQUFTLENBQUMsSUFBVixDQUFlLEdBQWYsQ0FBRDtJQU5oQyxDQUF2QjtFQURvQjtBQWxHdEIiLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LmFwaV9jYWxsID0gKG1ldGhvZCwgdXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZGF0YSB8fCBwYXJhbXNcclxuICBkYXRhID0gZGF0YSB8fCBwYXJhbXNcclxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09IDRcclxuICAgIGRhdGEgPSB1bmRlZmluZWRcclxuICBpZiBhcmd1bWVudHMubGVuZ3RoID09ICAzXHJcbiAgICBwYXJhbXMgPSB1bmRlZmluZWRcclxuICAgIGRhdGEgPSB1bmRlZmluZWRcclxuICBwYXJhbXMgPSBwYXJhbXMgfHwge31cclxuICBmb3IgaywgdiBvZiBwYXJhbXNcclxuICAgIGRlbGV0ZSBwYXJhbXNba10gaWYgbm90IHY/XHJcbiAgc2VwYXJhdG9yID0gaWYgdXJsLnNlYXJjaCgnXFxcXD8nKSA+PSAwIHRoZW4gJyYnIGVsc2UgJz8nXHJcbiAgJC5hamF4XHJcbiAgICB0eXBlOiBtZXRob2RcclxuICAgIHVybDogXCIje3VybH0je3NlcGFyYXRvcn0jeyQucGFyYW0gcGFyYW1zfVwiXHJcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICBhY2NlcHRzOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgIGRhdGE6IGlmIGRhdGEgdGhlbiBKU09OLnN0cmluZ2lmeShkYXRhKSBlbHNlIHVuZGVmaW5lZFxyXG4gICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgIGlmIGRhdGEuc3RhdHVzID09ICdzdWNjZXNzJ1xyXG4gICAgICAgIG1vcmUgPSB1bmRlZmluZWRcclxuICAgICAgICBpZiBkYXRhLm5leHRfdXJsXHJcbiAgICAgICAgICBtb3JlID0gKGNhbGxiYWNrKSAtPiBhcGlfY2FsbChtZXRob2QsIGRhdGEubmV4dF91cmwsIHt9LCBjYWxsYmFjaylcclxuICAgICAgICBjYWxsYmFjaz8gdW5kZWZpbmVkLCBkYXRhLnJlc3VsdCwgbW9yZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2s/IGRhdGFcclxuICAgIGVycm9yOiAoanFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duKSAtPlxyXG4gICAgICBlcnJvciA9XHJcbiAgICAgICAgZXJyb3JfY29kZTogJ2FqYXhfZXJyb3InXHJcbiAgICAgICAgdGV4dF9zdGF0dXM6IHRleHRTdGF0dXNcclxuICAgICAgICBlcnJvcl90aHJvd246IGVycm9yVGhyb3duXHJcbiAgICAgICAganFYSFI6IGpxWEhSXHJcbiAgICAgIHRyeVxyXG4gICAgICAgIGVycm9yID0gJC5wYXJzZUpTT04oanFYSFIucmVzcG9uc2VUZXh0KSBpZiBqcVhIUi5yZXNwb25zZVRleHRcclxuICAgICAgY2F0Y2ggZVxyXG4gICAgICAgIGVycm9yID0gZXJyb3JcclxuICAgICAgTE9HICdhcGlfY2FsbCBlcnJvcicsIGVycm9yXHJcbiAgICAgIGNhbGxiYWNrPyBlcnJvclxyXG4iLCIoLT5cclxuICBjbGFzcyB3aW5kb3cuRmlsZVVwbG9hZGVyXHJcbiAgICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zKSAtPlxyXG4gICAgICBAdXBsb2FkX2hhbmRsZXIgPSBAb3B0aW9ucy51cGxvYWRfaGFuZGxlclxyXG4gICAgICBAc2VsZWN0b3IgPSBAb3B0aW9ucy5zZWxlY3RvclxyXG4gICAgICBAZHJvcF9hcmVhID0gQG9wdGlvbnMuZHJvcF9hcmVhXHJcbiAgICAgIEB1cGxvYWRfdXJsID0gQG9wdGlvbnMudXBsb2FkX3VybCBvciBcIi9hcGkvdjEje3dpbmRvdy5sb2NhdGlvbi5wYXRobmFtZX1cIlxyXG4gICAgICBAY29uZmlybV9tZXNzYWdlID0gQG9wdGlvbnMuY29uZmlybV9tZXNzYWdlIG9yICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xyXG4gICAgICBAYWxsb3dlZF90eXBlcyA9IEBvcHRpb25zLmFsbG93ZWRfdHlwZXNcclxuICAgICAgQG1heF9zaXplID0gQG9wdGlvbnMubWF4X3NpemVcclxuXHJcbiAgICAgIEBhY3RpdmVfZmlsZXMgPSAwXHJcblxyXG4gICAgICBAc2VsZWN0b3I/LmJpbmQgJ2NoYW5nZScsIChlKSA9PlxyXG4gICAgICAgIEBmaWxlX3NlbGVjdF9oYW5kbGVyKGUpXHJcblxyXG4gICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgICBpZiBAZHJvcF9hcmVhPyBhbmQgeGhyLnVwbG9hZFxyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdvdmVyJywgQGZpbGVfZHJhZ19ob3ZlclxyXG4gICAgICAgIEBkcm9wX2FyZWEub24gJ2RyYWdsZWF2ZScsIEBmaWxlX2RyYWdfaG92ZXJcclxuICAgICAgICBAZHJvcF9hcmVhLm9uICdkcm9wJywgKGUpID0+XHJcbiAgICAgICAgICBAZmlsZV9zZWxlY3RfaGFuZGxlciBlXHJcbiAgICAgICAgQGRyb3BfYXJlYS5zaG93KClcclxuXHJcbiAgICAgIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9ID0+XHJcbiAgICAgICAgaWYgQGNvbmZpcm1fbWVzc2FnZT8gYW5kIEBhY3RpdmVfZmlsZXMgPiAwXHJcbiAgICAgICAgICByZXR1cm4gQGNvbmZpcm1fbWVzc2FnZVxyXG5cclxuICAgIGZpbGVfZHJhZ19ob3ZlcjogKGUpID0+XHJcbiAgICAgIGlmIG5vdCBAZHJvcF9hcmVhP1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBpZiBlLnR5cGUgaXMgJ2RyYWdvdmVyJ1xyXG4gICAgICAgIEBkcm9wX2FyZWEuYWRkQ2xhc3MgJ2RyYWctaG92ZXInXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAZHJvcF9hcmVhLnJlbW92ZUNsYXNzICdkcmFnLWhvdmVyJ1xyXG5cclxuICAgIGZpbGVfc2VsZWN0X2hhbmRsZXI6IChlKSA9PlxyXG4gICAgICBAZmlsZV9kcmFnX2hvdmVyKGUpXHJcbiAgICAgIGZpbGVzID0gZS5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlcj8uZmlsZXMgb3IgZS50YXJnZXQ/LmZpbGVzIG9yIGUuZGF0YVRyYW5zZmVyPy5maWxlc1xyXG4gICAgICBpZiBmaWxlcz8ubGVuZ3RoID4gMFxyXG4gICAgICAgIEB1cGxvYWRfZmlsZXMoZmlsZXMpXHJcblxyXG4gICAgdXBsb2FkX2ZpbGVzOiAoZmlsZXMpID0+XHJcbiAgICAgIEBnZXRfdXBsb2FkX3VybHMgZmlsZXMubGVuZ3RoLCAoZXJyb3IsIHVybHMpID0+XHJcbiAgICAgICAgaWYgZXJyb3JcclxuICAgICAgICAgIGNvbnNvbGUubG9nICdFcnJvciBnZXR0aW5nIFVSTHMnLCBlcnJvclxyXG4gICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgQHByb2Nlc3NfZmlsZXMgZmlsZXMsIHVybHMsIDBcclxuXHJcbiAgICBnZXRfdXBsb2FkX3VybHM6IChuLCBjYWxsYmFjaykgPT5cclxuICAgICAgcmV0dXJuIGlmIG4gPD0gMFxyXG4gICAgICBhcGlfY2FsbCAnR0VUJywgQHVwbG9hZF91cmwsIHtjb3VudDogbn0sIChlcnJvciwgcmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIGVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJvclxyXG4gICAgICAgICAgdGhyb3cgZXJyb3JcclxuICAgICAgICBjYWxsYmFjayB1bmRlZmluZWQsIHJlc3VsdFxyXG5cclxuICAgIHByb2Nlc3NfZmlsZXM6IChmaWxlcywgdXJscywgaSkgPT5cclxuICAgICAgcmV0dXJuIGlmIGkgPj0gZmlsZXMubGVuZ3RoXHJcbiAgICAgIEB1cGxvYWRfZmlsZSBmaWxlc1tpXSwgdXJsc1tpXS51cGxvYWRfdXJsLCBAdXBsb2FkX2hhbmRsZXI/LnByZXZpZXcoZmlsZXNbaV0pLCAoKSA9PlxyXG4gICAgICAgIEBwcm9jZXNzX2ZpbGVzIGZpbGVzLCB1cmxzLCBpICsgMSwgQHVwbG9hZF9oYW5kbGVyP1xyXG5cclxuICAgIHVwbG9hZF9maWxlOiAoZmlsZSwgdXJsLCBwcm9ncmVzcywgY2FsbGJhY2spID0+XHJcbiAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgICAgIGlmIEBhbGxvd2VkX3R5cGVzPy5sZW5ndGggPiAwXHJcbiAgICAgICAgaWYgZmlsZS50eXBlIG5vdCBpbiBAYWxsb3dlZF90eXBlc1xyXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAnd3JvbmdfdHlwZSdcclxuICAgICAgICAgIGNhbGxiYWNrKClcclxuICAgICAgICAgIHJldHVyblxyXG5cclxuICAgICAgaWYgQG1heF9zaXplP1xyXG4gICAgICAgIGlmIGZpbGUuc2l6ZSA+IEBtYXhfc2l6ZVxyXG4gICAgICAgICAgcHJvZ3Jlc3MgMCwgdW5kZWZpbmVkLCAndG9vX2JpZydcclxuICAgICAgICAgIGNhbGxiYWNrKClcclxuICAgICAgICAgIHJldHVyblxyXG5cclxuICAgICAgIyAkKCcjaW1hZ2UnKS52YWwoZmlsZS5uYW1lKTtcclxuICAgICAgeGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyICdwcm9ncmVzcycsIChldmVudCkgLT5cclxuICAgICAgICBwcm9ncmVzcyBwYXJzZUludCBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbCAqIDEwMC4wXHJcblxyXG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKGV2ZW50KSA9PlxyXG4gICAgICAgIGlmIHhoci5yZWFkeVN0YXRlID09IDRcclxuICAgICAgICAgIGlmIHhoci5zdGF0dXMgPT0gMjAwXHJcbiAgICAgICAgICAgIHJlc3BvbnNlID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KVxyXG4gICAgICAgICAgICBwcm9ncmVzcyAxMDAuMCwgcmVzcG9uc2UucmVzdWx0XHJcbiAgICAgICAgICAgICMgLy8kKCcjY29udGVudCcpLnZhbCh4aHIucmVzcG9uc2VUZXh0KVxyXG4gICAgICAgICAgICAkKCcjaW1hZ2UnKS52YWwoJCgnI2ltYWdlJykudmFsKCkgICsgcmVzcG9uc2UucmVzdWx0LmlkICsgJzsnKTtcclxuICAgICAgICAgICAgQGFjdGl2ZV9maWxlcyAtPSAxXHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHByb2dyZXNzIDAsIHVuZGVmaW5lZCwgJ2Vycm9yJ1xyXG4gICAgICAgICAgICBAYWN0aXZlX2ZpbGVzIC09IDFcclxuXHJcbiAgICAgIHhoci5vcGVuICdQT1NUJywgdXJsLCB0cnVlXHJcbiAgICAgIGRhdGEgPSBuZXcgRm9ybURhdGEoKVxyXG4gICAgICBkYXRhLmFwcGVuZCAnZmlsZScsIGZpbGVcclxuICAgICAgeGhyLnNlbmQgZGF0YVxyXG4gICAgICBjYWxsYmFjaygpXHJcbikoKSIsIndpbmRvdy5MT0cgPSAtPlxyXG4gIGNvbnNvbGU/LmxvZz8gYXJndW1lbnRzLi4uXHJcblxyXG5cclxud2luZG93LmluaXRfY29tbW9uID0gLT5cclxuICBpbml0X2xvYWRpbmdfYnV0dG9uKClcclxuICBpbml0X2NvbmZpcm1fYnV0dG9uKClcclxuICBpbml0X3Bhc3N3b3JkX3Nob3dfYnV0dG9uKClcclxuICBpbml0X3RpbWUoKVxyXG4gIGluaXRfYW5ub3VuY2VtZW50KClcclxuICBpbml0X3Jvd19saW5rKClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9sb2FkaW5nX2J1dHRvbiA9IC0+XHJcbiAgJCgnYm9keScpLm9uICdjbGljaycsICcuYnRuLWxvYWRpbmcnLCAtPlxyXG4gICAgJCh0aGlzKS5idXR0b24gJ2xvYWRpbmcnXHJcblxyXG5cclxud2luZG93LmluaXRfY29uZmlybV9idXR0b24gPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1jb25maXJtJywgLT5cclxuICAgIGlmIG5vdCBjb25maXJtICQodGhpcykuZGF0YSgnbWVzc2FnZScpIG9yICdBcmUgeW91IHN1cmU/J1xyXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG5cclxud2luZG93LmluaXRfcGFzc3dvcmRfc2hvd19idXR0b24gPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLmJ0bi1wYXNzd29yZC1zaG93JywgLT5cclxuICAgICR0YXJnZXQgPSAkKCQodGhpcykuZGF0YSAndGFyZ2V0JylcclxuICAgICR0YXJnZXQuZm9jdXMoKVxyXG4gICAgaWYgJCh0aGlzKS5oYXNDbGFzcyAnYWN0aXZlJ1xyXG4gICAgICAkdGFyZ2V0LmF0dHIgJ3R5cGUnLCAncGFzc3dvcmQnXHJcbiAgICBlbHNlXHJcbiAgICAgICR0YXJnZXQuYXR0ciAndHlwZScsICd0ZXh0J1xyXG5cclxuXHJcbndpbmRvdy5pbml0X3RpbWUgPSAtPlxyXG4gIGlmICQoJ3RpbWUnKS5sZW5ndGggPiAwXHJcbiAgICByZWNhbGN1bGF0ZSA9IC0+XHJcbiAgICAgICQoJ3RpbWVbZGF0ZXRpbWVdJykuZWFjaCAtPlxyXG4gICAgICAgIGRhdGUgPSBtb21lbnQudXRjICQodGhpcykuYXR0ciAnZGF0ZXRpbWUnXHJcbiAgICAgICAgZGlmZiA9IG1vbWVudCgpLmRpZmYgZGF0ZSAsICdkYXlzJ1xyXG4gICAgICAgIGlmIGRpZmYgPiAyNVxyXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUubG9jYWwoKS5mb3JtYXQgJ1lZWVktTU0tREQnXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJCh0aGlzKS50ZXh0IGRhdGUuZnJvbU5vdygpXHJcbiAgICAgICAgJCh0aGlzKS5hdHRyICd0aXRsZScsIGRhdGUubG9jYWwoKS5mb3JtYXQgJ2RkZGQsIE1NTU0gRG8gWVlZWSwgSEg6bW06c3MgWidcclxuICAgICAgc2V0VGltZW91dCBhcmd1bWVudHMuY2FsbGVlLCAxMDAwICogNDVcclxuICAgIHJlY2FsY3VsYXRlKClcclxuXHJcblxyXG53aW5kb3cuaW5pdF9hbm5vdW5jZW1lbnQgPSAtPlxyXG4gICQoJy5hbGVydC1hbm5vdW5jZW1lbnQgYnV0dG9uLmNsb3NlJykuY2xpY2sgLT5cclxuICAgIHNlc3Npb25TdG9yYWdlPy5zZXRJdGVtICdjbG9zZWRBbm5vdW5jZW1lbnQnLCAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXHJcblxyXG4gIGlmIHNlc3Npb25TdG9yYWdlPy5nZXRJdGVtKCdjbG9zZWRBbm5vdW5jZW1lbnQnKSAhPSAkKCcuYWxlcnQtYW5ub3VuY2VtZW50JykuaHRtbCgpXHJcbiAgICAkKCcuYWxlcnQtYW5ub3VuY2VtZW50Jykuc2hvdygpXHJcblxyXG5cclxud2luZG93LmluaXRfcm93X2xpbmsgPSAtPlxyXG4gICQoJ2JvZHknKS5vbiAnY2xpY2snLCAnLnJvdy1saW5rJywgLT5cclxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJCh0aGlzKS5kYXRhICdocmVmJ1xyXG5cclxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5ub3QtbGluaycsIChlKSAtPlxyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG5cclxuXHJcbndpbmRvdy5jbGVhcl9ub3RpZmljYXRpb25zID0gLT5cclxuICAkKCcjbm90aWZpY2F0aW9ucycpLmVtcHR5KClcclxuXHJcblxyXG53aW5kb3cuc2hvd19ub3RpZmljYXRpb24gPSAobWVzc2FnZSwgY2F0ZWdvcnk9J3dhcm5pbmcnKSAtPlxyXG4gIGNsZWFyX25vdGlmaWNhdGlvbnMoKVxyXG4gIHJldHVybiBpZiBub3QgbWVzc2FnZVxyXG5cclxuICAkKCcjbm90aWZpY2F0aW9ucycpLmFwcGVuZCBcIlwiXCJcclxuICAgICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LWRpc21pc3NhYmxlIGFsZXJ0LSN7Y2F0ZWdvcnl9XCI+XHJcbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjbG9zZVwiIGRhdGEtZGlzbWlzcz1cImFsZXJ0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+JnRpbWVzOzwvYnV0dG9uPlxyXG4gICAgICAgICN7bWVzc2FnZX1cclxuICAgICAgPC9kaXY+XHJcbiAgICBcIlwiXCJcclxuXHJcblxyXG53aW5kb3cuc2l6ZV9odW1hbiA9IChuYnl0ZXMpIC0+XHJcbiAgZm9yIHN1ZmZpeCBpbiBbJ0InLCAnS0InLCAnTUInLCAnR0InLCAnVEInXVxyXG4gICAgaWYgbmJ5dGVzIDwgMTAwMFxyXG4gICAgICBpZiBzdWZmaXggPT0gJ0InXHJcbiAgICAgICAgcmV0dXJuIFwiI3tuYnl0ZXN9ICN7c3VmZml4fVwiXHJcbiAgICAgIHJldHVybiBcIiN7cGFyc2VJbnQobmJ5dGVzICogMTApIC8gMTB9ICN7c3VmZml4fVwiXHJcbiAgICBuYnl0ZXMgLz0gMTAyNC4wXHJcbiIsIiQgLT5cclxuICBpbml0X2NvbW1vbigpXHJcblxyXG4kIC0+ICQoJ2h0bWwuYXV0aCcpLmVhY2ggLT5cclxuICBpbml0X2F1dGgoKVxyXG5cclxuJCAtPiAkKCdodG1sLnVzZXItbGlzdCcpLmVhY2ggLT5cclxuICBpbml0X3VzZXJfbGlzdCgpXHJcblxyXG4kIC0+ICQoJ2h0bWwudXNlci1tZXJnZScpLmVhY2ggLT5cclxuICBpbml0X3VzZXJfbWVyZ2UoKVxyXG5cclxuJCAtPiAkKCdodG1sLnJlc291cmNlLWxpc3QnKS5lYWNoIC0+XHJcbiAgaW5pdF9yZXNvdXJjZV9saXN0KClcclxuXHJcbiQgLT4gJCgnaHRtbC5yZXNvdXJjZS12aWV3JykuZWFjaCAtPlxyXG4gIGluaXRfcmVzb3VyY2VfdmlldygpXHJcblxyXG4kIC0+ICQoJ2h0bWwucmVzb3VyY2UtdXBsb2FkJykuZWFjaCAtPlxyXG4gIGluaXRfcmVzb3VyY2VfdXBsb2FkKCkiLCJ3aW5kb3cuaW5pdF9hdXRoID0gLT5cclxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UgLT5cclxuICAgIGJ1dHRvbnMgPSAkKCcuYnRuLXNvY2lhbCcpLnRvQXJyYXkoKS5jb25jYXQgJCgnLmJ0bi1zb2NpYWwtaWNvbicpLnRvQXJyYXkoKVxyXG4gICAgZm9yIGJ1dHRvbiBpbiBidXR0b25zXHJcbiAgICAgIGhyZWYgPSAkKGJ1dHRvbikucHJvcCAnaHJlZidcclxuICAgICAgaWYgJCgnLnJlbWVtYmVyIGlucHV0JykuaXMgJzpjaGVja2VkJ1xyXG4gICAgICAgICQoYnV0dG9uKS5wcm9wICdocmVmJywgXCIje2hyZWZ9JnJlbWVtYmVyPXRydWVcIlxyXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAkKGJ1dHRvbikucHJvcCAnaHJlZicsIGhyZWYucmVwbGFjZSAnJnJlbWVtYmVyPXRydWUnLCAnJ1xyXG4gICAgICAgICQoJyNyZW1lbWJlcicpLnByb3AgJ2NoZWNrZWQnLCBmYWxzZVxyXG5cclxuICAkKCcucmVtZW1iZXInKS5jaGFuZ2UoKVxyXG4iLCIjIGh0dHA6Ly9ibG9nLmFub3JnYW4uY29tLzIwMTIvMDkvMzAvcHJldHR5LW11bHRpLWZpbGUtdXBsb2FkLWJvb3RzdHJhcC1qcXVlcnktdHdpZy1zaWxleC9cclxuaWYgJChcIi5wcmV0dHktZmlsZVwiKS5sZW5ndGhcclxuICAkKFwiLnByZXR0eS1maWxlXCIpLmVhY2ggKCkgLT5cclxuICAgIHByZXR0eV9maWxlID0gJCh0aGlzKVxyXG4gICAgZmlsZV9pbnB1dCA9IHByZXR0eV9maWxlLmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJylcclxuICAgIGZpbGVfaW5wdXQuaGlkZSgpXHJcbiAgICBmaWxlX2lucHV0LmNoYW5nZSAoKSAtPlxyXG4gICAgICBmaWxlcyA9IGZpbGVfaW5wdXRbMF0uZmlsZXNcclxuICAgICAgaW5mbyA9IFwiXCJcclxuICAgICAgaWYgZmlsZXMubGVuZ3RoID4gMVxyXG4gICAgICAgIGluZm8gPSBcIiN7ZmlsZXMubGVuZ3RofSBmaWxlcyBzZWxlY3RlZFwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBwYXRoID0gZmlsZV9pbnB1dC52YWwoKS5zcGxpdChcIlxcXFxcIilcclxuICAgICAgICBpbmZvID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdXHJcbiAgICAgIHByZXR0eV9maWxlLmZpbmQoXCIuaW5wdXQtZ3JvdXAgaW5wdXRcIikudmFsKGluZm8pXHJcbiAgICBwcmV0dHlfZmlsZS5maW5kKFwiLmlucHV0LWdyb3VwXCIpLmNsaWNrIChlKSAtPlxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgZmlsZV9pbnB1dC5jbGljaygpXHJcbiAgICAgICQodGhpcykuYmx1cigpXHJcbiIsIndpbmRvdy5pbml0X3Jlc291cmNlX2xpc3QgPSAoKSAtPlxyXG4gIGluaXRfZGVsZXRlX3Jlc291cmNlX2J1dHRvbigpXHJcblxyXG53aW5kb3cuaW5pdF9yZXNvdXJjZV92aWV3ID0gKCkgLT5cclxuICBpbml0X2RlbGV0ZV9yZXNvdXJjZV9idXR0b24oKVxyXG5cclxud2luZG93LmluaXRfcmVzb3VyY2VfdXBsb2FkID0gKCkgLT5cclxuICBpZiB3aW5kb3cuRmlsZSBhbmQgd2luZG93LkZpbGVMaXN0IGFuZCB3aW5kb3cuRmlsZVJlYWRlclxyXG4gICAgd2luZG93LmZpbGVfdXBsb2FkZXIgPSBuZXcgRmlsZVVwbG9hZGVyXHJcbiAgICAgIHVwbG9hZF9oYW5kbGVyOiB1cGxvYWRfaGFuZGxlclxyXG4gICAgICBzZWxlY3RvcjogJCgnLmZpbGUnKVxyXG4gICAgICBkcm9wX2FyZWE6ICQoJy5kcm9wLWFyZWEnKVxyXG4gICAgICBjb25maXJtX21lc3NhZ2U6ICdGaWxlcyBhcmUgc3RpbGwgYmVpbmcgdXBsb2FkZWQuJ1xyXG4gICAgICB1cGxvYWRfdXJsOiAkKCcuZmlsZScpLmRhdGEoJ2dldC11cGxvYWQtdXJsJylcclxuICAgICAgYWxsb3dlZF90eXBlczogW11cclxuICAgICAgbWF4X3NpemU6IDEwMjQgKiAxMDI0ICogMTAyNFxyXG5cclxudXBsb2FkX2hhbmRsZXIgPVxyXG4gIHByZXZpZXc6IChmaWxlKSAtPlxyXG4gICAgJHJlc291cmNlID0gJCBcIlwiXCJcclxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29sLWxnLTIgY29sLW1kLTMgY29sLXNtLTQgY29sLXhzLTZcIj5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0aHVtYm5haWxcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByZXZpZXdcIj48L2Rpdj5cclxuICAgICAgICAgICAgPGg1PiN7ZmlsZS5uYW1lfTwvaDU+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1iYXJcIiBzdHlsZT1cIndpZHRoOiAwJTtcIj48L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtdGV4dFwiPjwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICBcIlwiXCJcclxuICAgICRwcmV2aWV3ID0gJCgnLnByZXZpZXcnLCAkcmVzb3VyY2UpXHJcblxyXG4gICAgaWYgZmlsZV91cGxvYWRlci5hY3RpdmVfZmlsZXMgPCAxNiBhbmQgZmlsZS50eXBlLmluZGV4T2YoXCJpbWFnZVwiKSBpcyAwXHJcbiAgICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgICAgcmVhZGVyLm9ubG9hZCA9IChlKSA9PlxyXG4gICAgICAgICRwcmV2aWV3LmNzcygnYmFja2dyb3VuZC1pbWFnZScsIFwidXJsKCN7ZS50YXJnZXQucmVzdWx0fSlcIilcclxuICAgICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSlcclxuICAgIGVsc2VcclxuICAgICAgJHByZXZpZXcudGV4dChmaWxlLnR5cGUgb3IgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpXHJcblxyXG4gICAgJCgnLnJlc291cmNlLXVwbG9hZHMnKS5wcmVwZW5kKCRyZXNvdXJjZSlcclxuXHJcbiAgICAocHJvZ3Jlc3MsIHJlc291cmNlLCBlcnJvcikgPT5cclxuICAgICAgaWYgZXJyb3JcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmFkZENsYXNzKCdwcm9ncmVzcy1iYXItZGFuZ2VyJylcclxuICAgICAgICBpZiBlcnJvciA9PSAndG9vX2JpZydcclxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiRmFpbGVkISBUb28gYmlnLCBtYXg6ICN7c2l6ZV9odW1hbihmaWxlX3VwbG9hZGVyLm1heF9zaXplKX0uXCIpXHJcbiAgICAgICAgZWxzZSBpZiBlcnJvciA9PSAnd3JvbmdfdHlwZSdcclxuICAgICAgICAgICQoJy5wcm9ncmVzcy10ZXh0JywgJHJlc291cmNlKS50ZXh0KFwiRmFpbGVkISBXcm9uZyBmaWxlIHR5cGUuXCIpXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoJ0ZhaWxlZCEnKVxyXG4gICAgICAgIHJldHVyblxyXG5cclxuICAgICAgaWYgcHJvZ3Jlc3MgPT0gMTAwLjAgYW5kIHJlc291cmNlXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLWJhcicsICRyZXNvdXJjZSkuYWRkQ2xhc3MoJ3Byb2dyZXNzLWJhci1zdWNjZXNzJylcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIlN1Y2Nlc3MgI3tzaXplX2h1bWFuKGZpbGUuc2l6ZSl9XCIpXHJcbiAgICAgICAgaWYgcmVzb3VyY2UuaW1hZ2VfdXJsIGFuZCAkcHJldmlldy50ZXh0KCkubGVuZ3RoID4gMFxyXG4gICAgICAgICAgJHByZXZpZXcuY3NzKCdiYWNrZ3JvdW5kLWltYWdlJywgXCJ1cmwoI3tyZXNvdXJjZS5pbWFnZV91cmx9KVwiKVxyXG4gICAgICAgICAgJHByZXZpZXcudGV4dCgnJylcclxuICAgICAgZWxzZSBpZiBwcm9ncmVzcyA9PSAxMDAuMFxyXG4gICAgICAgICQoJy5wcm9ncmVzcy1iYXInLCAkcmVzb3VyY2UpLmNzcygnd2lkdGgnLCAnMTAwJScpXHJcbiAgICAgICAgJCgnLnByb2dyZXNzLXRleHQnLCAkcmVzb3VyY2UpLnRleHQoXCIxMDAlIC0gUHJvY2Vzc2luZy4uXCIpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtYmFyJywgJHJlc291cmNlKS5jc3MoJ3dpZHRoJywgXCIje3Byb2dyZXNzfSVcIilcclxuICAgICAgICAkKCcucHJvZ3Jlc3MtdGV4dCcsICRyZXNvdXJjZSkudGV4dChcIiN7cHJvZ3Jlc3N9JSBvZiAje3NpemVfaHVtYW4oZmlsZS5zaXplKX1cIilcclxuXHJcblxyXG53aW5kb3cuaW5pdF9kZWxldGVfcmVzb3VyY2VfYnV0dG9uID0gKCkgLT5cclxuICAkKCdib2R5Jykub24gJ2NsaWNrJywgJy5idG4tZGVsZXRlJywgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGlmIGNvbmZpcm0oJ1ByZXNzIE9LIHRvIGRlbGV0ZSB0aGUgcmVzb3VyY2UnKVxyXG4gICAgICAkKHRoaXMpLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcclxuICAgICAgYXBpX2NhbGwgJ0RFTEVURScsICQodGhpcykuZGF0YSgnYXBpLXVybCcpLCAoZXJyLCByZXN1bHQpID0+XHJcbiAgICAgICAgaWYgZXJyXHJcbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcclxuICAgICAgICAgIExPRyAnU29tZXRoaW5nIHdlbnQgdGVycmlibHkgd3JvbmcgZHVyaW5nIGRlbGV0ZSEnLCBlcnJcclxuICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIHRhcmdldCA9ICQodGhpcykuZGF0YSgndGFyZ2V0JylcclxuICAgICAgICByZWRpcmVjdF91cmwgPSAkKHRoaXMpLmRhdGEoJ3JlZGlyZWN0LXVybCcpXHJcbiAgICAgICAgaWYgdGFyZ2V0XHJcbiAgICAgICAgICAkKFwiI3t0YXJnZXR9XCIpLnJlbW92ZSgpXHJcbiAgICAgICAgaWYgcmVkaXJlY3RfdXJsXHJcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlZGlyZWN0X3VybCIsIndpbmRvdy5pbml0X3VzZXJfbGlzdCA9IC0+XHJcbiAgaW5pdF91c2VyX3NlbGVjdGlvbnMoKVxyXG4gIGluaXRfdXNlcl9kZWxldGVfYnRuKClcclxuICBpbml0X3VzZXJfbWVyZ2VfYnRuKClcclxuXHJcblxyXG5pbml0X3VzZXJfc2VsZWN0aW9ucyA9IC0+XHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cclxuICAgIHVzZXJfc2VsZWN0X3JvdyAkKHRoaXMpXHJcblxyXG4gICQoJyNzZWxlY3QtYWxsJykuY2hhbmdlIC0+XHJcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdJykucHJvcCAnY2hlY2tlZCcsICQodGhpcykuaXMgJzpjaGVja2VkJ1xyXG4gICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cclxuICAgICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcclxuXHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAtPlxyXG4gICAgdXNlcl9zZWxlY3Rfcm93ICQodGhpcylcclxuXHJcblxyXG51c2VyX3NlbGVjdF9yb3cgPSAoJGVsZW1lbnQpIC0+XHJcbiAgdXBkYXRlX3VzZXJfc2VsZWN0aW9ucygpXHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmVhY2ggLT5cclxuICAgIGlkID0gJGVsZW1lbnQudmFsKClcclxuICAgICQoXCIjI3tpZH1cIikudG9nZ2xlQ2xhc3MgJ3dhcm5pbmcnLCAkZWxlbWVudC5pcyAnOmNoZWNrZWQnXHJcblxyXG5cclxudXBkYXRlX3VzZXJfc2VsZWN0aW9ucyA9IC0+XHJcbiAgc2VsZWN0ZWQgPSAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5sZW5ndGhcclxuICAkKCcjdXNlci1hY3Rpb25zJykudG9nZ2xlQ2xhc3MgJ2hpZGRlbicsIHNlbGVjdGVkID09IDBcclxuICAkKCcjdXNlci1tZXJnZScpLnRvZ2dsZUNsYXNzICdoaWRkZW4nLCBzZWxlY3RlZCA8IDJcclxuICBpZiBzZWxlY3RlZCBpcyAwXHJcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdjaGVja2VkJywgZmFsc2VcclxuICBlbHNlIGlmICQoJ2lucHV0W25hbWU9dXNlcl9kYl06bm90KDpjaGVja2VkKScpLmxlbmd0aCBpcyAwXHJcbiAgICAkKCcjc2VsZWN0LWFsbCcpLnByb3AgJ2luZGV0ZXJtaW5hdGUnLCBmYWxzZVxyXG4gICAgJCgnI3NlbGVjdC1hbGwnKS5wcm9wICdjaGVja2VkJywgdHJ1ZVxyXG4gIGVsc2VcclxuICAgICQoJyNzZWxlY3QtYWxsJykucHJvcCAnaW5kZXRlcm1pbmF0ZScsIHRydWVcclxuXHJcblxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiMgRGVsZXRlIFVzZXJzIFN0dWZmXHJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuaW5pdF91c2VyX2RlbGV0ZV9idG4gPSAtPlxyXG4gICQoJyN1c2VyLWRlbGV0ZScpLmNsaWNrIChlKSAtPlxyXG4gICAgY2xlYXJfbm90aWZpY2F0aW9ucygpXHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGNvbmZpcm1fbWVzc2FnZSA9ICgkKHRoaXMpLmRhdGEgJ2NvbmZpcm0nKS5yZXBsYWNlICd7dXNlcnN9JywgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpjaGVja2VkJykubGVuZ3RoXHJcbiAgICBpZiBjb25maXJtIGNvbmZpcm1fbWVzc2FnZVxyXG4gICAgICB1c2VyX2tleXMgPSBbXVxyXG4gICAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XHJcbiAgICAgICAgJCh0aGlzKS5hdHRyICdkaXNhYmxlZCcsIHRydWVcclxuICAgICAgICB1c2VyX2tleXMucHVzaCAkKHRoaXMpLnZhbCgpXHJcbiAgICAgIGRlbGV0ZV91cmwgPSAkKHRoaXMpLmRhdGEgJ2FwaS11cmwnXHJcbiAgICAgIHN1Y2Nlc3NfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnc3VjY2VzcydcclxuICAgICAgZXJyb3JfbWVzc2FnZSA9ICQodGhpcykuZGF0YSAnZXJyb3InXHJcbiAgICAgIGFwaV9jYWxsICdERUxFVEUnLCBkZWxldGVfdXJsLCB7dXNlcl9rZXlzOiB1c2VyX2tleXMuam9pbignLCcpfSwgKGVyciwgcmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIGVyclxyXG4gICAgICAgICAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXTpkaXNhYmxlZCcpLnJlbW92ZUF0dHIgJ2Rpc2FibGVkJ1xyXG4gICAgICAgICAgc2hvd19ub3RpZmljYXRpb24gZXJyb3JfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdkYW5nZXInXHJcbiAgICAgICAgICByZXR1cm5cclxuICAgICAgICAkKFwiIyN7cmVzdWx0LmpvaW4oJywgIycpfVwiKS5mYWRlT3V0IC0+XHJcbiAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpXHJcbiAgICAgICAgICB1cGRhdGVfdXNlcl9zZWxlY3Rpb25zKClcclxuICAgICAgICAgIHNob3dfbm90aWZpY2F0aW9uIHN1Y2Nlc3NfbWVzc2FnZS5yZXBsYWNlKCd7dXNlcnN9JywgdXNlcl9rZXlzLmxlbmd0aCksICdzdWNjZXNzJ1xyXG5cclxuXHJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuIyBNZXJnZSBVc2VycyBTdHVmZlxyXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbndpbmRvdy5pbml0X3VzZXJfbWVyZ2UgPSAtPlxyXG4gIHVzZXJfa2V5cyA9ICQoJyN1c2VyX2tleXMnKS52YWwoKVxyXG4gIGFwaV91cmwgPSAkKCcuYXBpLXVybCcpLmRhdGEgJ2FwaS11cmwnXHJcbiAgYXBpX2NhbGwgJ0dFVCcsIGFwaV91cmwsIHt1c2VyX2tleXM6IHVzZXJfa2V5c30sIChlcnJvciwgcmVzdWx0KSAtPlxyXG4gICAgaWYgZXJyb3JcclxuICAgICAgTE9HICdTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZydcclxuICAgICAgcmV0dXJuXHJcbiAgICB3aW5kb3cudXNlcl9kYnMgPSByZXN1bHRcclxuICAgICQoJ2lucHV0W25hbWU9dXNlcl9kYl0nKS5yZW1vdmVBdHRyICdkaXNhYmxlZCdcclxuXHJcbiAgJCgnaW5wdXRbbmFtZT11c2VyX2RiXScpLmNoYW5nZSAoZXZlbnQpIC0+XHJcbiAgICB1c2VyX2tleSA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKClcclxuICAgIHNlbGVjdF9kZWZhdWx0X3VzZXIgdXNlcl9rZXlcclxuXHJcblxyXG5zZWxlY3RfZGVmYXVsdF91c2VyID0gKHVzZXJfa2V5KSAtPlxyXG4gICQoJy51c2VyLXJvdycpLnJlbW92ZUNsYXNzKCdzdWNjZXNzJykuYWRkQ2xhc3MgJ2RhbmdlcidcclxuICAkKFwiIyN7dXNlcl9rZXl9XCIpLnJlbW92ZUNsYXNzKCdkYW5nZXInKS5hZGRDbGFzcyAnc3VjY2VzcydcclxuXHJcbiAgZm9yIHVzZXJfZGIgaW4gdXNlcl9kYnNcclxuICAgIGlmIHVzZXJfa2V5ID09IHVzZXJfZGIua2V5XHJcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcl9rZXldJykudmFsIHVzZXJfZGIua2V5XHJcbiAgICAgICQoJ2lucHV0W25hbWU9dXNlcm5hbWVdJykudmFsIHVzZXJfZGIudXNlcm5hbWVcclxuICAgICAgJCgnaW5wdXRbbmFtZT1uYW1lXScpLnZhbCB1c2VyX2RiLm5hbWVcclxuICAgICAgJCgnaW5wdXRbbmFtZT1lbWFpbF0nKS52YWwgdXNlcl9kYi5lbWFpbFxyXG4gICAgICBicmVha1xyXG5cclxuXHJcbmluaXRfdXNlcl9tZXJnZV9idG4gPSAtPlxyXG4gICQoJyN1c2VyLW1lcmdlJykuY2xpY2sgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIHVzZXJfa2V5cyA9IFtdXHJcbiAgICAkKCdpbnB1dFtuYW1lPXVzZXJfZGJdOmNoZWNrZWQnKS5lYWNoIC0+XHJcbiAgICAgIHVzZXJfa2V5cy5wdXNoICQodGhpcykudmFsKClcclxuICAgIHVzZXJfbWVyZ2VfdXJsID0gJCh0aGlzKS5kYXRhICd1c2VyLW1lcmdlLXVybCdcclxuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gXCIje3VzZXJfbWVyZ2VfdXJsfT91c2VyX2tleXM9I3t1c2VyX2tleXMuam9pbignLCcpfVwiXHJcbiJdfQ==
