async function main() {
  const contractAddress = '0x7c22d234fb027dbe382c3dfddd56bc06caa86233';

  await run('verify:verify', {
    address: contractAddress,
    constructorArguments: [],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
