import { IUserDocument } from '../db/models/definitions/users';
import { ROLES } from './constants';
import { can } from './permissions/utils';

/**
 * Checks whether user is logged in or not
 */
export const checkLogin = (user: IUserDocument) => {
  if (!user) {
    throw new Error('Login required');
  }
};

/**
 * Checks if user is logged and if user is admin
 */
export const checkAdmin = (user: IUserDocument) => {
  if (!user.isOwner && user.role !== ROLES.ADMIN) {
    throw new Error('Permission required');
  }
};

/**
 * Wraps object property (function) with permission checkers
 */
export const permissionWrapper = (cls: any, methodName: string, checkers: any) => {
  const oldMethod = cls[methodName];

  cls[methodName] = (root, args, { user }) => {
    for (const checker of checkers) {
      checker(user);
    }

    return oldMethod(root, args, { user });
  };
};

/**
 * Wraps a method with 'Login required' permission checker
 */
export const requireLogin = (cls: any, methodName: string) => permissionWrapper(cls, methodName, [checkLogin]);

/**
 * Wraps a method with 'Permission required' permission checker
 */
export const requireAdmin = (cls: any, methodName: string) =>
  permissionWrapper(cls, methodName, [checkLogin, checkAdmin]);

/**
 * Wraps all properties (methods) of a given object with 'Login required' permission checker
 */
export const moduleRequireLogin = (mdl: any) => {
  for (const method in mdl) {
    if (mdl.hasOwnProperty(method)) {
      requireLogin(mdl, method);
    }
  }
};

/**
 * Wraps all properties (methods) of a given object with 'Permission required' permission checker
 */
export const moduleRequireAdmin = (mdl: any) => {
  for (const method in mdl) {
    if (mdl.hasOwnProperty(method)) {
      requireAdmin(mdl, method);
    }
  }
};

/**
 * Wraps all properties (methods) of a given object with 'Permission action required' permission checker
 */
export const moduleCheckPermission = (mdl: any, action: string, defaultValue?: any) => {
  for (const method in mdl) {
    if (mdl.hasOwnProperty(method)) {
      checkPermission(mdl, method, action, defaultValue);
    }
  }
};

/**
 * Checks if user is logged and if user is can action
 * @param {Object} user - User object
 * @throws {Exception} throws Error('Permission required')
 * @return {null}
 */
export const checkPermission = async (cls: any, methodName: string, actionName: string, defaultValue?: any) => {
  const oldMethod = cls[methodName];

  cls[methodName] = async (root, args, { user }) => {
    checkLogin(user);

    if (user.isOwner) {
      return true;
    }

    const allowed = await can(actionName, user._id);

    if (!allowed) {
      if (defaultValue) {
        return defaultValue;
      }

      throw new Error('Permission required');
    }

    return oldMethod(root, args, { user });
  };
};

export default {
  requireLogin,
  requireAdmin,
  moduleRequireLogin,
  moduleRequireAdmin,
  checkPermission,
};
