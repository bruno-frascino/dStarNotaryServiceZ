pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract StarNotary is ERC721 { 

    struct Star { 
        string name;
        string ra;
        string dec;
        string mag;
        string cent;
        string story;
    }

    mapping(uint256 => Star) public tokenToStarInfo; 
    mapping(bytes32 => bool) public allTokenKeys; 
    mapping(uint256 => uint256) public starTokensForSale;
    uint256 private idsForSaleQtd;

    //Creates a star asset and an asssociated token
    function createStar(string _name, string _ra, string _dec, string _mag, string _cent, string _story, uint256 _tokenId) public { 
        
        //check required input data
        require(bytes(_dec).length > 0 && bytes(_mag).length > 0 && bytes(_cent).length > 0, "Invalid input params");

       //check if star already exists.
        require(checkIfStarExist(_dec, _mag, _cent) == false, "Star already exists.");
        
        Star memory newStar = Star(_name, _ra, _dec, _mag, _cent, _story);

        //Token -> Star
        tokenToStarInfo[_tokenId] = newStar;

        //Address
        //Token -> Address (inside _mint())
        //_tokenOwner
        _mint(msg.sender, _tokenId);

        //save a unique hash as key based on the star coordinates
        //so we can check if a star has already been registered.
        allTokenKeys[keccak256(abi.encodePacked(_dec, _mag, _cent))] = true;
    }

    //coordinates are dec + mag + cent, strictly in this order
    //for generating a hash key with keccak256
    function checkIfStarExist(string dec, string mag, string cent ) internal view returns (bool) {

        return allTokenKeys[keccak256(abi.encodePacked(dec, mag, cent))];
    }

    //Owner or authorized user can put Star up for sale.
    function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
        
        require(_isApprovedOrOwner(msg.sender, _tokenId),  "Only owner or approved user can put star up for sale.");

        starTokensForSale[_tokenId] = _price;
        //update index
        idsForSaleQtd++;
    }

    //An address needs to be approved to buy
    function buyStar(uint256 _tokenId) public payable { 
        require(starTokensForSale[_tokenId] > 0, "No star is up for sale.");
        
        uint256 starCost = starTokensForSale[_tokenId];
        address starOwner = ownerOf(_tokenId);

        require(msg.value >= starCost, "Payment is insufficient to buy star.");

        //validates if the buyer is approved
        //and if the destination is not empty
        //clear approval, transfer the token and emit 
        // the Transfer event
        safeTransferFrom(starOwner, msg.sender, _tokenId);

        //transfer payment to owner
        starOwner.transfer(starCost);

        //return change
        if(msg.value > starCost) { 
            msg.sender.transfer(msg.value - starCost);
        }

        //star not up for sale anymore
        starTokensForSale[_tokenId] = 0;
        //update index
        idsForSaleQtd--;
    }

    //
    function starsForSale() external view returns(uint256[]){

        uint256[] memory _starsForSale;

        //not empty
        if (idsForSaleQtd > 0){

            //set fixed size
            _starsForSale = new uint256[](idsForSaleQtd);

            //mapping to array
            for(uint256 i; i < idsForSaleQtd; i++ ){
                _starsForSale[i] = starTokensForSale[i];
            }
        }
        //empty mapping
        else {
            _starsForSale = new uint256[](1);
            _starsForSale[0] = 0;
        }

        return _starsForSale;
    }

    //
    function tokenIdToStarInfo(uint256 _tokenId) 
        external view returns(string name, string story, string ra, string dec, string mag){

        require(_tokenId > 0, "Invalid token");

        //get Star info
        Star memory star = tokenToStarInfo[_tokenId];

        return( star.name,
            star.story,
            string(abi.encodePacked("ra_", star.ra)),
            string(abi.encodePacked("dec_", star.dec)),
            string(abi.encodePacked("mag_", star.mag)));
    }   
}