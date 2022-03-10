const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deployTipjar } = require('../helpers/deploy');

describe('Tipjar', function () {
  let sender, receiver;
  let tipjarContract;
  let tip, gasLimitMax;
  let senderStartingBalance, receiverStartingBalance;

  beforeEach(async () => {
    [, sender, receiver] = await ethers.getSigners();
    tipjarContract = await deployTipjar();
    tip = ethers.BigNumber.from(100000000000000);
    gasLimitMax = ethers.BigNumber.from(44000000);
    senderStartingBalance = await sender.getBalance();
    receiverStartingBalance = await receiver.getBalance();
  });

  it('has decreased sender balance for expected amount', async () => {
    await tipjarContract.connect(sender).sendTip(receiver.address, {
      value: tip,
    });
    const senderEndBalance = await sender.getBalance();

    expect(senderStartingBalance.sub(senderEndBalance).gt(tip)).to.be.true;
  });

  it('has increased reciever balance for expected amount', async () => {
    await tipjarContract.connect(sender).sendTip(receiver.address, {
      value: tip,
    });

    const receiverEndBalance = await receiver.getBalance();

    expect(receiverEndBalance.sub(receiverStartingBalance)).to.equals(tip);
  });

  it('transaction emit event', async () => {
    await expect(
      tipjarContract.connect(sender).sendTip(receiver.address, {
        value: tip,
      })
    )
      .to.emit(tipjarContract, 'TipReceived')
      .withArgs(sender.address, receiver.address, tip);
  });

  it('will fail when sender is recipient', async () => {
    await expect(
      tipjarContract.connect(sender).sendTip(sender.address, {
        value: tip,
      })
    ).to.be.revertedWith('SenderIsRecipient');
  });

  it('will fail empty amount', async () => {
    await expect(
      tipjarContract.connect(sender).sendTip(receiver.address, {
        value: 0,
      })
    ).to.be.revertedWith('InvalidAmount');
  });

  it('will fail invalid amount', async () => {
    await expect(
      tipjarContract.connect(sender).sendTip(receiver.address, {
        value: ethers.BigNumber.from(10000000000000),
      })
    ).to.be.revertedWith('InvalidAmount');
  });
});
