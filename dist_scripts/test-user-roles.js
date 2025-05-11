"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var db = new client_1.PrismaClient();
function testUserRoles() {
    return __awaiter(this, void 0, void 0, function () {
        var testEmail, user, initialUser, updatedUser, userAfterUpdate, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    testEmail = 'role-test-user@example.com';
                    console.log("Starting role assignment and query test for user: ".concat(testEmail));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, 7, 11]);
                    // 1. Create a new user for testing
                    console.log('Attempting to create a test user...');
                    return [4 /*yield*/, db.user.create({
                            data: {
                                email: testEmail,
                                name: 'Role Test User',
                                roles: [client_1.Role.USER], // Initial role
                            },
                        })];
                case 2:
                    user = _b.sent();
                    console.log("User created with ID: ".concat(user.id, " and roles: ").concat(user.roles));
                    return [4 /*yield*/, db.user.findUnique({ where: { id: user.id } })];
                case 3:
                    initialUser = _b.sent();
                    console.log("Queried initial roles: ".concat(initialUser === null || initialUser === void 0 ? void 0 : initialUser.roles));
                    // AC2: Programmatically assign one or more roles
                    console.log('Assigning additional roles [ORGANIZER, ADMIN]...');
                    return [4 /*yield*/, db.user.update({
                            where: { id: user.id },
                            data: {
                                roles: { set: [client_1.Role.USER, client_1.Role.ORGANIZER, client_1.Role.ADMIN] }, // Set new roles
                            },
                        })];
                case 4:
                    updatedUser = _b.sent();
                    console.log("Roles updated. New roles: ".concat(updatedUser.roles));
                    return [4 /*yield*/, db.user.findUnique({ where: { id: user.id } })];
                case 5:
                    userAfterUpdate = _b.sent();
                    console.log("Queried roles after update: ".concat(userAfterUpdate === null || userAfterUpdate === void 0 ? void 0 : userAfterUpdate.roles));
                    if (JSON.stringify((_a = userAfterUpdate === null || userAfterUpdate === void 0 ? void 0 : userAfterUpdate.roles) === null || _a === void 0 ? void 0 : _a.slice().sort()) !== JSON.stringify([client_1.Role.ADMIN, client_1.Role.ORGANIZER, client_1.Role.USER].slice().sort())) {
                        throw new Error('Role update verification failed!');
                    }
                    console.log('Role update successfully verified.');
                    return [3 /*break*/, 11];
                case 6:
                    error_1 = _b.sent();
                    console.error('Error during test-user-roles script:', error_1);
                    return [3 /*break*/, 11];
                case 7:
                    if (!user) return [3 /*break*/, 9];
                    console.log("Cleaning up: Deleting test user with ID: ".concat(user.id));
                    return [4 /*yield*/, db.user.delete({ where: { id: user.id } })];
                case 8:
                    _b.sent();
                    console.log('Test user deleted.');
                    _b.label = 9;
                case 9: return [4 /*yield*/, db.$disconnect()];
                case 10:
                    _b.sent();
                    console.log('Disconnected from database.');
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
testUserRoles();
