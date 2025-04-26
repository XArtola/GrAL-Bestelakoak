Feature: Unable to withdraw cash with invalid card
	
	#In order to <meet some goal>
	#As a <type of stakeholder>
	#I want <a feature>
	
	In order to keep my bank account safe	
	As a credit card user	
	I don't want it to be able to withdraw cash with an invalid card	
	
	#An easy to read and understand scenario
	Scenario: Attempt withdrawal using stolen card
		Given I have $100 in my account
		But my card is invalid
		When I request $50
		Then my card should not be returned
		And I should be told to contact the bank
		
	#The same scenario with replaced but/and - still valid
	Scenario: Attempt withdrawal using stolen card
		Given I have $100 in my account
		And my card is invalid
		When I request $50
		Then my card should not be returned
		But I should be told to contact the bank
		
	#The same scenario with but/and replaced with given/then - still valid
	Scenario: Attempt withdrawal using stolen card
		Given I have $100 in my account
		Given my card is invalid
		When I request $50
		Then my card should not be returned
		Then I should be told to contact the bank