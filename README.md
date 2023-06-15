# Library Sui

Library housing util methods and classes to interact with Bluefin protocol deployed on Sui
blockchain

## Prerequisites:

-   SUI Node: >=0.33
-   Node: v18.x.x

### Linux users:

-   for installing sui on your local computer you need to follow the tutorial on sui
    website but make sure that you install using this command
-   `cargo install --locked --git https://github.com/MystenLabs/sui.git --tag devnet-1.2.0 sui`
-   What the above command is doing is that it is installing the 0.33.0 version which is
    compatible with the contracts.

## Mac users:

-   If you are using MAC with M1 chip after following the installation instructions you
    will likely face an error for invalid symbol for architecture arm64 with some cryptic
    error message.
-   To resolve this error first uninstall rust from your mac and reinstall it with the
    following options
-   ` default host triple: x86_64-apple-darwin default toolchain: stable profile: default modify PATH variable: yes`
-   Then you can install sui the same was by running this command
-   `cargo install --locked --git https://github.com/MystenLabs/sui.git --tag devnet-1.2.0 sui`

## How to

-   Install dependencies using `yarn`
-   Build using `yarn build`

## HOW TO CONTRIBUTE (IMPORTANT):

-   If you want to make any changes to the library-sui, you create a new branch from main
    and make changes there
-   Then you make a pull request to merge your changes to main
-   Then some checks will run and if all checks passed your changes will be merged.
    HOWEVER there is one catch
-   If BUILD fails on PR checks and there is no error in your code then do the following:
-   GET THE LATEST deployment.json file and update the contents of deployment.example.json
    with that

### But Why?

-   What is happening that this code used sui deployed on cloud (bluefin). And sui cloud
    is restarted sometimes. When it is restarted all contracts deployed there are lost,
    then some contracts are redeployed hence it implies new deployment.json file made.
