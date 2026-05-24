/**
 * ESLint custom rule: forbid raw Firestore collection string literals & direct FieldValue.serverTimestamp
 * يمنع استخدام أسماء المجموعات مباشرة بدون الرجوع إلى constants
 */
"use strict";

const FORBIDDEN_COLLECTIONS = [
  'users','documents','file_movements','notifications','activity_logs','reports','system_backups',
  'daily_statistics','system_settings','notification_settings','rate_limits','invitations','counters'
];

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw Firestore collection literals and direct FieldValue.serverTimestamp()',
      recommended: false
    },
    messages: {
      rawCollection: "Direct Firestore collection literal '{{name}}' is forbidden. Use COLLECTIONS constant.",
      rawServerTimestamp: "Use serverTS() helper instead of FieldValue.serverTimestamp() directly."
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        try {
          if (
            node.callee &&
            node.callee.type === 'MemberExpression' &&
            node.callee.property &&
            node.callee.property.name === 'collection' &&
            node.arguments &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'Literal' &&
            typeof node.arguments[0].value === 'string'
          ) {
            const val = node.arguments[0].value;
            if (FORBIDDEN_COLLECTIONS.includes(val)) {
              context.report({ node: node.arguments[0], messageId: 'rawCollection', data: { name: val } });
            }
          }
        } catch(_) { }
      },
      MemberExpression(node) {
        const isFieldValue = node.object && node.object.type === 'MemberExpression' &&
          node.object.property && node.object.property.name === 'FieldValue';
        if (isFieldValue && node.property && node.property.name === 'serverTimestamp') {
          context.report({ node, messageId: 'rawServerTimestamp' });
        }
      }
    };
  }
};
