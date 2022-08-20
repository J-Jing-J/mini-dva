// 源码总结：核心dva函数，返回app
// app.start：启动，把provider放外层传递store

// dva：
// 概念：数据流解决方案
// 大的状态框管理库主要就是：redux、mobx（dva不算，dva只是用到了redux）

// dva好久没更新了
// 做的东西并不多，基于别的框架弄了一个新的model出来
// redux和redux-saga的数据流方案，为了简化开发体验，还内置了react-router，和fetch，也可以说是一个轻量级的应用框架

// 出现背景：
// 以前用redux：
// 一个页面要涉及到很多文件：页面本身、store的index和reducer文件、action(saga)
// bug不好找，改文件费力，不好维护

// dva：核心思想：把reducer、initialState、action、saga封装到一个model中
// 现在我们只需要关注主页面也model文件就可以了

import React from 'react';
import invariant from 'invariant';
import { createBrowserHistory, createMemoryHistory, createHashHistory } from 'history';
import document from 'global/document';
import {
  Provider,
  connect,
  connectAdvanced,
  useSelector,
  useDispatch,
  useStore,
  shallowEqual,
} from 'react-redux';
import { bindActionCreators } from 'redux';
import { utils, create, saga } from 'dva-core';
import * as router from 'react-router-dom';
import * as routerRedux from 'connected-react-router';
import { app } from '..';

const { connectRouter, routerMiddleware } = routerRedux;
const { isFunction } = utils;
const { useHistory, useLocation, useParams, useRouteMatch } = router;

export default function(opts = {}) {
    // 默认使用哈希路由
  const history = opts.history || createHashHistory();

//   初始值：reducer、中间件
  const createOpts = {
    initialReducer: {
      router: connectRouter(history),
    },
    setupMiddlewares(middlewares) {
      return [routerMiddleware(history), ...middlewares];
    },
    setupApp(app) {
      app._history = patchHistory(history);
    },
  };

  const app = create(opts, createOpts);
  const oldAppStart = app.start;
  app.router = router;
  app.start = start;
  return app;

  function router(router) {
    invariant(
      isFunction(router),
      `[app.router] router should be function, but got ${typeof router}`,
    );
    app._router = router;
  }

  function start(container) {
    // 允许 container 是字符串，然后用 querySelector 找元素
    if (isString(container)) {
      container = document.querySelector(container);
      invariant(container, `[app.start] container ${container} not found`);
    }

    // 并且是 HTMLElement
    invariant(
      !container || isHTMLElement(container),
      `[app.start] container should be HTMLElement`,
    );

    // 路由必须提前注册
    invariant(app._router, `[app.start] router must be registered before app.start()`);

    if (!app._store) {
      oldAppStart.call(app);
    }
    const store = app._store;

    // export _getProvider for HMR
    // ref: https://github.com/dvajs/dva/issues/469
    app._getProvider = getProvider.bind(null, store, app);

    // If has container, render; else, return react component
    if (container) {
      render(container, store, app, app._router);
      app._plugin.apply('onHmr')(render.bind(null, container, store, app));
    } else {
      return getProvider(store, this, this._router);
    }
  }
}

function isHTMLElement(node) {
  return typeof node === 'object' && node !== null && node.nodeType && node.nodeName;
}

function isString(str) {
  return typeof str === 'string';
}

function getProvider(store, app, router) {
  const DvaRoot = extraProps => (
    <Provider store={store}>{router({ app, history: app._history, ...extraProps })}</Provider>
  );
  return DvaRoot;
}

function render(container, store, app, router) {
  const ReactDOM = require('react-dom'); // eslint-disable-line
  ReactDOM.render(React.createElement(getProvider(store, app, router)), container);
}

function patchHistory(history) {
  const oldListen = history.listen;
  history.listen = callback => {
    // TODO: refact this with modified ConnectedRouter
    // Let ConnectedRouter to sync history to store first
    // connected-react-router's version is locked since the check function may be broken
    // min version of connected-react-router
    // e.g.
    // function (e, t) {
    //   var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    //   r.inTimeTravelling ? r.inTimeTravelling = !1 : a(e, t, n)
    // }
    // ref: https://github.com/umijs/umi/issues/2693
    const cbStr = callback.toString();
    const isConnectedRouterHandler =
      (callback.name === 'handleLocationChange' && cbStr.indexOf('onLocationChanged') > -1) ||
      (cbStr.indexOf('.inTimeTravelling') > -1 &&
        cbStr.indexOf('.inTimeTravelling') > -1 &&
        cbStr.indexOf('arguments[2]') > -1);
    callback(history.location, history.action);
    return oldListen.call(history, (...args) => {
      if (isConnectedRouterHandler) {
        callback(...args);
      } else {
        // Delay all listeners besides ConnectedRouter
        setTimeout(() => {
          callback(...args);
        });
      }
    });
  };
  return history;
}

export fetch from 'isomorphic-fetch';
export dynamic from './dynamic';
export { connect, connectAdvanced, useSelector, useDispatch, useStore, shallowEqual };
export { bindActionCreators };
export { router };
export { saga };
export { routerRedux };
export { createBrowserHistory, createMemoryHistory, createHashHistory };
export { useHistory, useLocation, useParams, useRouteMatch };