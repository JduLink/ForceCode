
import * as vscode from 'vscode';
import * as chalk from 'chalk';
import * as moment from 'moment';
import jsforce = require('jsforce');
const DEBUG_LEVEL_NAME: string = 'FORCE_CODE';
const LOG_TYPE: string = 'DEVELOPER_LOG';

export default class Logger {
    public context: vscode.ExtensionContext;
    constructor(context) {
        this.context = context;
    }
    // =========================================================================================================
    // =====================       USING REST API      =========================================================
    // =========================================================================================================
    createDebugLevel(debugLevel: jsforce.DebugLevel): Promise<string> {
        const options: jsforce.DebugLevel = debugLevel || {
            ApexCode: 'DEBUG',
            ApexProfiling: 'DEBUG',
            Callout: 'DEBUG',
            Database: 'DEBUG',
            DeveloperName: DEBUG_LEVEL_NAME,
            MasterLabel: DEBUG_LEVEL_NAME,
            System: 'DEBUG',
            Validation: 'DEBUG',
            Visualforce: 'DEBUG',
            Workflow: 'DEBUG',
        };
        const query: string = `Select Id, DeveloperName from debugLevel where DeveloperName = '${DEBUG_LEVEL_NAME}'`;
        return vscode.window.forceCode.conn.tooling.query(query).then(res => {
            if (res.records.length > 0) {
                return res.records[0].Id;
            } else {
                return vscode.window.forceCode.conn.tooling.sobject('debugLevel').create(options).then(record => {
                    return record.id;
                });
            }
        });
    }
    enableLogging(debugLevelId: string): any {
        'use strict';
        const expirationDate: string = moment().add(6, 'hours').format();
        // const startDate: string = moment().format();
        const options: jsforce.TraceFlagOptions = {
            DebugLevelId: debugLevelId,
            ExpirationDate: expirationDate,
            LogType: LOG_TYPE,
            TracedEntityId: vscode.window.forceCode.userInfo.id,
        };

        const query: string = `Select Id from traceFlag where TracedEntityId = '${vscode.window.forceCode.userInfo.id}'`;
        return vscode.window.forceCode.conn.tooling.query(query).then(res => {
            if (res.records.length > 0) {
                // Trace Flag already exists
                this.cleanupLogging(res.records[0].Id);
                return 'true';
            } else {
                return vscode.window.forceCode.conn.tooling.sobject('debugLevel').create(options).then(record => {
                    return record.id;
                });
            }
        });
        // return service.conn.tooling.sobject('traceFlag').upsert(options);
    }

    getLastLog(result: any): any {
        'use strict';
        var queryString: string = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
            + ` AND Operation like '%executeAnonymous%'`
            + ` AND LogUserId='${vscode.window.forceCode.userInfo.id}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;

        return vscode.window.forceCode.conn.query(queryString)
            .then(function (queryResult: any) {
                var id: string = queryResult.records[0].Id;
                return id;
            });
    }


    getLog(logId: string): any {
        'use strict';
        var url: string = `${vscode.window.forceCode.conn._baseUrl()}/sobjects/ApexLog/${logId}/Body`;
        return new Promise((resolve, reject) => {
            vscode.window.forceCode.conn.request(url, function (err, res) {
                resolve(res);
            });
        });
    }

    truncateLog(logBody: string) {
        'use strict';
        var regex: any = /\|USER_DEBUG\|/g;
        var debug: string = logBody
            .split('\n')
            .filter(line => !!line.match(regex))
            .map(line => line.split('\|DEBUG\|')[1])
            .join('\n');
        return chalk.red(debug);
    }

    showLog(logBody) {
        'use strict';
        vscode.window.forceCode.clearLog();
        vscode.window.forceCode.outputChannel.appendLine(logBody);
        return true;
    }

    cleanupLogging(id) {
        'use strict';
        return vscode.window.forceCode.conn.tooling.sobject('traceFlag').del(id);
    }

    onError(err) {
        'use strict';
        console.error(err);
    }
}




// function getLogId(result: any): any {
//     'use strict';
//     var message: string = '';
//     if (!result.compiled) {
//         message = 'Compile Problem: ' + result.compileProblem;
//         vscode.window.showErrorMessage(message);
//         return Promise.reject(message);
//     } else if (!result.success) {
//         message = 'Exception: ' + result.exceptionMessage;
//         vscode.window.showErrorMessage(message);
//         return Promise.reject(message);
//     } else {
//         var statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
//         statusBarItem.text = 'Hello';
//         statusBarItem.tooltip = 'Hello';
//         statusBarItem.color = 'Red';
//         // vscode.window.showInformationMessage('Execute Anonymous Success', 'Foo', 'Bar').then(response => setTimeout( () => {console.log(response)}, 5000));
//         // setTimeout(function() {
//         // }, 5000);
//         executeAnonymousService.queryString = `SELECT Id FROM ApexLog WHERE Request = 'API' AND Location = 'SystemLog'`
//             + ` AND Operation like '%executeAnonymous%'`
//             + ` AND LogUserId='${executeAnonymousService.userId}' ORDER BY StartTime DESC, Id DESC LIMIT 1`;
//         return executeAnonymousService.connection.query(executeAnonymousService.queryString)
//             .then(function(queryResult: any) {
//                 var id: string = queryResult.records[0].Id;
//                 return id;
//             });
//     }
// }
