var util = require('util'),
    Tab = require('../client/tab').Tab;

var MxnTab = function ()
{
  Tab.call(this);
};

util.inherits(MxnTab, Tab);

MxnTab.prototype.tabName = 'mxn';
MxnTab.prototype.mainMenu = 'fund';

MxnTab.prototype.angularDeps = Tab.prototype.angularDeps.concat(['qr']);

MxnTab.prototype.generateHtml = function ()
{
  return require('../../jade/tabs/mxn.jade')();
};

MxnTab.prototype.angular = function (module)
{
  module.controller('MxnCtrl', ['$scope', 'rpId', 'rpAppManager', 'rpTracker', '$routeParams', 'rpKeychain', 'rpNetwork', '$timeout',
    function ($scope, $id, appManager, rpTracker, $routeParams, keychain, $network, $timeout) {

      $scope.$watch('lines', function () {
        if($scope.lines['rG6FZ31hDHN1K5Dkbma3PSB5uVCuVVRzfnMXN']){
          $scope.mxnConnected = true;
        }
        else {
          $scope.mxnConnected = false;
        }
      }, true);



      $scope.toggle_instructions = function () {
        $scope.showInstructions = !$scope.showInstructions;
      };

      $scope.save_account = function () {

        $scope.loading = true;

        $scope.load_notification('loading');

        var amount = ripple.Amount.from_human(
            Options.gateway_max_limit + ' ' + 'MXN',
            {reference_date: new Date(+new Date() + 5*60000)}
        );

        amount.set_issuer("rG6FZ31hDHN1K5Dkbma3PSB5uVCuVVRzfn");

        if (!amount.is_valid()) {
          // Invalid amount. Indicates a bug in one of the validators.
          console.log('Invalid amount');
          return;
        }

        var tx = $network.remote.transaction();

        // Add memo to tx
        tx.addMemo('client', 'rt' + $scope.version);

        // Flags
        tx
            .rippleLineSet($id.account, amount)
            .on('proposed', function(res){
              $scope.$apply(function () {
                setEngineStatus(res, false);              
              });
            })
            .on('success', function (res) {
              $scope.$apply(function () {
                setEngineStatus(res, true);

                $scope.loading = false;
                $scope.load_notification('success');
                $scope.editing = false;
              });
            })
            .on('error', function (res) {
              setEngineStatus(res, false);
              console.log('error', res);
              setImmediate(function () {
                $scope.$apply(function () {
                  $scope.mode = 'error';

                  $scope.loading = false;
                  $scope.load_notification("error");
                  $scope.editing = false;
                });
              });
            });

        function setEngineStatus(res, accepted) {
          $scope.engine_result = res.engine_result;
          $scope.engine_result_message = res.engine_result_message;
          $scope.engine_status_accepted = accepted;

          switch (res.engine_result.slice(0, 3)) {
            case 'tes':
              $scope.tx_result = accepted ? 'cleared' : 'pending';
              break;
            case 'tem':
              $scope.tx_result = 'malformed';
              break;
            case 'ter':
              $scope.tx_result = 'failed';
              break;
            case 'tec':
              $scope.tx_result = 'failed';
              break;
            case 'tel':
              $scope.tx_result = "local";
              break;
            case 'tep':
              console.warn('Unhandled engine status encountered!');
          }
          if ($scope.tx_result=="cleared"){
            $scope.mxnConnected = true;
            $scope.showInstructions = true;

          }
          console.log($scope.tx_result);
        }

        keychain.requestSecret($id.account, $id.username, function (err, secret) {
          // XXX Error handling
          if (err) {
            $scope.loading = false;
            $scope.load_notification('error');
            console.log(err);
            return;
          }

          $scope.mode = 'granting';

          tx.secret(secret);
          tx.submit();


        });

        // $timeout(function(){
        //   $scope.mode = 'main';
        // }, 10000);

      };

    }]);

};

module.exports = MxnTab;
