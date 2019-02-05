const StarNotary = artifacts.require('StarNotary')

contract('StarNotary', accounts => { 

    beforeEach(async function() { 
        this.contract = await StarNotary.new({from: accounts[0]})
    })

    describe('Testing function CreateStar() - Check missing inputs', () => { 
        it('Missing inputs have been detected.', async function () { 
            
            const ra = "18h14m44.26";
            const dec = "-45°35'42.7''";
            const mag = "";
            const cent = "";
            const story = "Found in the sea."

            try{
                //try to create with missing parameters
                await this.contract
                    .createStar('awesome star!', ra, dec, mag, cent, story, 1, {from: accounts[0]});
                
                assert.fail("Star with missing parameters shouldn't be created.");
            }
            catch(error){
                assert.exists(error);
            }
        })
    })


    describe('Testing function CreateStar() - mint()', () => { 
        it('A star has been created and its coordinates have been checked ok.', async function () { 
            
            const ra = "18h14m44.26";
            const dec = "-45°35'42.7''";
            const mag = "7.19";
            const cent = "Telescopium";
            const story = "Found in the sea."
            await this.contract
                .createStar('awesome star!', ra, dec, mag, cent, story, 1, {from: accounts[0]})

            const star1 = await this.contract.tokenToStarInfo(1);

            assert.equal(star1[2], dec);
            assert.equal(star1[3], mag);
            assert.equal(star1[4], cent);
        })
    })

    describe('Testing function checkIfStarExist() - Check Star uniqueness', () => { 
        it('Star uniqueness has been validated.', async function () { 
            
            const ra = "18h14m44.26";
            const dec = "-45°35'42.7''";
            const mag = "7.19";
            const cent = "Telescopium";
            const story = "Found in the sea."

            await this.contract
                .createStar('awesome star!', ra, dec, mag, cent, story, 1, {from: accounts[0]})

            const star1 = await this.contract.tokenToStarInfo(1);
            assert.equal(star1[2], dec);
            assert.equal(star1[3], mag);
            assert.equal(star1[4], cent);

            try{
                //try to create the same star
                await this.contract
                    .createStar('awesome star!', ra, dec, mag, cent, story, 2, {from: accounts[0]});
                
                assert.fail('Star uniqueness validation failed.');
            }
            catch(error){
                assert.exists(error);
            }
        })
    })

    describe('Testing Buying and Selling Stars - approve(), putStarUpForSale(),', () => { 
        let user1 = accounts[1]
        let user2 = accounts[2]
        let randomMaliciousUser = accounts[3]
        
        let starId = 1
        let starPrice = web3.toWei(.01, "ether")

        beforeEach(async function () { 

            const ra = "18h14m44.26";
            const dec = "-45°35'42.7''";
            const mag = "7.19";
            const cent = "Telescopium";
            const story = "Found in the sea."

            await this.contract.createStar('awesome star!', ra, dec, mag, cent, story, starId, {from: user1})    
        })

        it('User1 can put up their star for sale', async function () { 

            await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            
            assert.equal(await this.contract.starTokensForSale(starId), starPrice)
        })

        it('User2 cannot put up another user\'s star for sale', async function () { 
            
            try{
                await this.contract.putStarUpForSale(starId, starPrice, {from: user2})
                
                assert.fail('Failed to validate putStarUpForSale() permission.')
            }
            catch(error){
                assert.exists(error);
            }
        })

        it('User2 can put up another user\'s star for sale when authorized', async function () { 
            
            //approve user 2
            await this.contract.approve(user2, starId, {from: user1});
            await this.contract.putStarUpForSale(starId, starPrice, {from: user2})
                
            assert.equal(await this.contract.starTokensForSale(starId), starPrice)
        })

        describe('User not authorized cannot buy a star that was put up for sale', () => { 

            it('User not authorized fails trying to buy a star.', async function() { 
                
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})

                try{
                    await this.contract.buyStar(starId, {from: randomMaliciousUser, value: starPrice, gasPrice: 0})
                    assert.fail('Fail to validate authorized users');
                }
                catch(error){
                    assert.exists(error);
                }
            })
        })

        describe('User2 can buy a star that was put up for sale - buyStar(), safeTransferFrom(), ownerOf(), getApproved()', () => { 
            beforeEach(async function () { 
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            })

            it('User2 is the owner of the star after they buy it', async function() { 
                //user 2 needs to be approved.
                await this.contract.approve(user2, starId, {from: user1});

                await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
                assert.equal(await this.contract.ownerOf(starId), user2)
            })

            it('user2 ether balance changed correctly', async function () { 
                let overpaidAmount = web3.toWei(.05, 'ether')
                const balanceBeforeTransaction = web3.eth.getBalance(user2)
                //user 2 needs to be approved.
                await this.contract.approve(user2, starId, {from: user1});
                await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
                const balanceAfterTransaction = web3.eth.getBalance(user2)

                assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
            })
        })
    })

    describe('Testing function TokenIdToStarInfo', () => { 
        it('Getting Star Info', async function () { 
            
            const ra = "18h14m44.26";
            const dec = "-45°35'42.7''";
            const mag = "7.19";
            const cent = "Telescopium";
            const story = "Found in the sea."

            await this.contract
                .createStar('awesome star!', ra, dec, mag, cent, story, 1, {from: accounts[0]})

            const star1 = await this.contract.tokenIdToStarInfo(1);
            console.log(star1);

        })
    })

    describe('Testing function starsForSale(), SetApprovalForAll(), isApprovedForAll', () => { 
        
        const user1 = accounts[0];
        const operator = accounts[1]; 

        const star1 = 1;
        const star2 = 2;

        const starPrice = web3.toWei(.01, "ether")

        beforeEach(async function () { 

            const ra1 = "18h14m44.26";
            const dec1 = "-45°35'42.7''";
            const mag1 = "7.19";
            const cent1 = "Telescopium";
            const story1 = "Found in the sea."

            const ra2 = "19h54m49.05";
            const dec2 = "+35°00'20.1''";
            const mag2 = "8.57";
            const cent2 = "Cygnus";
            const story2 = "Found in the pool."

            //user 1 creates star 1
            await this.contract
                .createStar('Star 1!', ra1, dec1, mag1, cent1, story1, star1, {from: user1})

            //user 1 creates star 2
            await this.contract
                .createStar('Star 2!', ra2, dec2, mag2, cent2, story2, star2, {from: user1})

            //put them up for sale
            await this.contract.putStarUpForSale(star1, starPrice, {from: user1})
            await this.contract.putStarUpForSale(star2, starPrice, {from: user1})
        })
        
        it('Setting approval for an operator to have permission to buy all tokens.', async function () { 
            
            //user 1 authorizes operator
            await this.contract.setApprovalForAll(operator, true, {from: user1});

            //operator buys
            await this.contract.buyStar(star1, {from: operator, value: starPrice, gasPrice: 0})
            await this.contract.buyStar(star2, {from: operator, value: starPrice, gasPrice: 0})

            //check owner
            assert.equal(await this.contract.ownerOf(star1), operator)
            assert.equal(await this.contract.ownerOf(star2), operator)

        })

        it('Testing function starsForSale()', async function () { 

            //Stars for sale
            const stars = await this.contract.starsForSale();
           
            //check owner
            assert.equal(2, stars.length);
        })
    })
})